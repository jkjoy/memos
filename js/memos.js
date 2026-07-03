const memo = {
    host: 'https://memos.ee', // 确保这个值是正确的
    limit: '100',
    creatorId: '1',
    domId: '#posts',
    twikoo: 'https://t.memos.ee'
};

if (typeof memos !== "undefined") {
    for (let key in memos) {
        if (memos[key]) {
            memo[key] = memos[key];
        }
    }
}
var memohost = memo.host.replace(/\/$/, '')
var load = '<div class="nav-links"><span id="load-more" class="loadmore" role="button" tabindex="0">加载更多</span></div>'
var loading = '<div class="nav-links loading" aria-live="polite"><span class="loadmore loading-text">加载中</span><span class="loading-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>'

window.onload = function() {
    let offset = 0;
    const limit = 10;
    let isLoading = false;
    let avatarurl, memoname, userurl, description, memoUsername;

    function normalizeAssetUrl(url) {
        if (!url) {
            return 'favicon.ico';
        }
        if (/^(data:|https?:\/\/|\/\/)/i.test(url)) {
            return url;
        }
        if (url.startsWith('/')) {
            return `${memohost}${url}`;
        }
        return `${memohost}/${url}`;
    }

    function getUserNameFromResourceName(name) {
        return name ? name.split('/').pop() : '';
    }

    function fetchJson(url) {
        return fetch(url).then(response => {
            if (!response.ok) {
                throw new Error(`${response.status} ${response.statusText}`);
            }
            return response.json();
        });
    }

    function normalizeUserData(userData) {
        const username = userData.username || getUserNameFromResourceName(userData.name);
        return {
            avatarUrl: normalizeAssetUrl(userData.avatarUrl),
            displayName: userData.displayName || userData.nickname || username || 'Memos',
            username,
            description: userData.description || ''
        };
    }

    function fetchUserData() {
        return fetchJson(`${memohost}/api/v1/users/${memo.creatorId}`)
            .catch(() => fetchJson(`${memohost}/api/v1/user/${memo.creatorId}`))
            .then(normalizeUserData);
    }

    // 获取用户信息
    fetchUserData()
       .then(userData => {
            avatarurl = userData.avatarUrl;
            memoname = userData.displayName;
            memoUsername = userData.username;
            userurl = userData.username ? `${memohost}/u/${userData.username}` : memohost;
            description = userData.description;

            // 更新 banner 信息
            const bannerSubinfo = document.getElementById('banner-subinfo');
            bannerSubinfo.textContent = description;
            const bannerBackground = document.getElementById('banner-background');
            bannerBackground.style.backgroundImage = 'url("https://pic.0tz.top/api")';
            const avatarImg = document.querySelector('.avatar.g-right img.g-alias-imgblock');
            if (avatarImg) {
                avatarImg.src = avatarurl;
            }

            // 初始化并加载 memos
            fetchAndDisplayMemos();
        })
       .catch(error => {
            console.error('Error fetching user data:', error);
        });

        function getLocationHtml(location) {
            if (location && location.placeholder) {
                const placeholder = location.placeholder;
                // 提取最后两位（省份和国家）
                const parts = placeholder.split(',').map(part => part.trim());
                if (parts.length >= 2) {
                    const province = parts[parts.length - 2]; // 倒数第二位是省份
                    const country = parts[parts.length - 1];  // 最后一位是国家
                    const locationSvg = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                            <path d="M12 20.8995L16.9497 15.9497C19.6834 13.2161 19.6834 8.78392 16.9497 6.05025C14.2161 3.31658 9.78392 3.31658 7.05025 6.05025C4.31658 8.78392 4.31658 13.2161 7.05025 15.9497L12 20.8995ZM12 23.7279L5.63604 17.364C2.12132 13.8492 2.12132 8.15076 5.63604 4.63604C9.15076 1.12132 14.8492 1.12132 18.364 4.63604C21.8787 8.15076 21.8787 13.8492 18.364 17.364L12 23.7279ZM12 13C13.1046 13 14 12.1046 14 11C14 9.89543 13.1046 9 12 9C10.8954 9 10 9.89543 10 11C10 12.1046 10.8954 13 12 13ZM12 15C9.79086 15 8 13.2091 8 11C8 8.79086 9.79086 7 12 7C14.2091 7 16 8.79086 16 11C16 13.2091 14.2091 15 12 15Z"></path>
                        </svg>`;
                    return `<p class="location">${locationSvg} ${country}, ${province}</p>`; // 重新排序为“国家, 省份”
                }
            }
            return '';
        }

        function formatHTML(memosData) {
            let htmlString = '';
            memosData.forEach(memo => {
                const content = memo.content || '';
                const resources = memo.resources || memo.resourceList || [];
                const formatteduid = memo.name ? memo.name.split('/').pop() : (memo.uid || memo.id);
                const createTime = memo.createTime || new Date((memo.displayTs || memo.createdTs || Date.now() / 1000) * 1000).toISOString();
                const memoUrl = memo.name ? `${memohost}/memos/${formatteduid}` : `${memohost}/m/${formatteduid}`;
                const commentFormId = `twikoo-form-${String(formatteduid).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
                let resourceElement = '';
                let imageCount = 0;
        
                const locationHtml = getLocationHtml(memo.location);
                // 尝试从 memo 内容中匹配图片 URL
                const regex = /!\[.*?\]\((https?:\/\/.+?)\)/gi;
                let match;
                while ((match = regex.exec(content)) !== null) {
                    const imageUrl = match[1];
                    resourceElement += `<figure class="gallery-thumbnail aspectratio" style="--aspectratio: 3024 / 4032;"><img src="${imageUrl}" data-fancybox="img" class="thumbnail-image g-alias-imgblock"> </figure>`;
                    imageCount++;
                }
        
                if (resources && resources.length > 0) {
                    resources.forEach(resource => {
                        const externalLink = resource.externalLink || resource.externalUrl;
                        if (externalLink) {
                            // 检查链接是否为图片文件
                            if (/\.(jpeg|jpg|gif|png|bmp|webp)/i.test(externalLink)) {
                                resourceElement += `
                                <figure class="gallery-thumbnail aspectratio" style="--aspectratio: 4032 / 3024;">
                                    <img class="thumbnail-image g-alias-imgblock" src="${externalLink}" />
                                </figure>
                                `;
                                imageCount++;
                            } else {
                                resourceElement += `<a href="${externalLink}" target="_blank">点击下载</a>`;
                            }
                        } else {
                            const resourceUrl = resource.name && resource.filename
                                ? `${memohost}/file/${resource.name}/${resource.filename}`
                                : normalizeAssetUrl(resource.publicUrl || resource.internalPath || resource.filename || '');
                            // 检查链接是否为图片文件
                            if (/\.(jpeg|jpg|gif|png|bmp|webp)/i.test(resourceUrl)) {
                                resourceElement += `<a href="${resourceUrl}" target="_blank"><img src="${resourceUrl}" class="thumbnail-image g-alias-imgblock"></a>`;
                                imageCount++;
                            } else {
                                resourceElement += `<a href="${resourceUrl}" target="_blank">点击下载</a>`;
                            }
                        }
                    });
                }
        
                // 根据图片数量设置 CSS 类
                let gridClass = '';
                if (imageCount === 1) {
                    gridClass = 'grid-1';
                } else if (imageCount === 2 || imageCount === 4) {
                    gridClass = 'grid-2';
                } else if (imageCount === 3 || imageCount > 4) {
                    gridClass = 'grid-3';
                }
        
            // 使用 marked 转换 markdown 内容为 HTML，并处理其中的超链接
            const htmlContent = marked.parse(content.replace(/```\s*```/g, '').replace(/```\s*\n\s*```/g, '')
               .replace(/\!?\[(.*?)\]\((.*?)\)/g, ''));
            const processedContent = processLinks(htmlContent);

            // 创建 memo HTML 字符串，包括图片和内容
            htmlString += `
             <article id="post-${formatteduid}" class="g-clear-both">
                <div class="post-avatar g-left">
                    <a href="${userurl}" target="_blank">   
                        <img class="g-alias-imgblock" src="${avatarurl}" loading="lazy" style="width: 40px; height: 40px;" alt=""/>
                    </a>
                </div>
                <div class="post-main g-right">
                    <header class="post-header g-clear-both">
                        <div class="post-title g-left g-txt-ellipsis g-user-select">${memoname}</div>
                    </header>
                    <section class="post-content g-inline-justify g-user-select">
                        <p> ${processedContent}</p>  
                        <div class="post-content-gallery ${gridClass}">
                              ${resourceElement}     
                        </div>
                    </section>
                    ${locationHtml}
                    <footer class="post-footer g-clear-both">
                        <div class="post-info g-left g-txt-ellipsis">
                            <a href="${memoUrl}" target="_blank">
                                <span class="post-date">${new Date(createTime).toLocaleString()}</span>
                            </a>
                        </div>
                        <div class="post-fun g-right">
                            <button class="post-comment-toggle" type="button" data-comment-toggle data-url="${memoUrl}" data-target="${commentFormId}" aria-controls="${commentFormId}" aria-expanded="false" title="评论">
                                <span class="dot"></span>
                                <span class="dot"></span>
                            </button>
                        </div>
                    </footer>
                    <aside class="post-aside show">
                            <div class="fun-area post-comment g-clear-both index show">
                                <div data-url="${memoUrl}" class="post">
                                    <div class="comment-summary" aria-live="polite"></div>
                                    <ul class="comment-list"></ul>
                                    <div class="comment-form-shell" data-comment-form-shell aria-hidden="true">
                                        <div class="comment-form-head">
                                            <span>写评论</span>
                                            <button type="button" class="comment-form-close" data-comment-close data-url="${memoUrl}" aria-label="收起评论">收起</button>
                                        </div>
                                        <div id="${commentFormId}" class="twikoo-form twikoo" data-twikoo-path="${memoUrl}"></div>
                                    </div>
                                </div> 
                            </div>
                        </aside>
                </div>
            </article>`;
        });
        return htmlString;
    }

    function fetchMemos() {
        return fetchJson(`${memohost}/api/v1/memos?pageSize=${memo.limit}&parent=users/${memo.creatorId}`)
           .then(data => data.memos)
           .catch(() => {
                const params = [`limit=${encodeURIComponent(memo.limit)}`];
                if (memoUsername) {
                    params.push(`creatorUsername=${encodeURIComponent(memoUsername)}`);
                }
                return fetchJson(`${memohost}/api/v1/memo/all?${params.join('&')}`);
           })
           .catch(error => {
                console.error('Error fetching memos:', error);
                return [];
            });
    }

    var memoDom = document.querySelector(memo.domId);
    if (memoDom) {}

    function getCommentPanel(postUrl) {
        return document.querySelector(`.post[data-url="${postUrl}"]`);
    }

    function setCommentFormOpen(commentPanel, shouldOpen) {
        const shell = commentPanel?.querySelector('[data-comment-form-shell]');
        const postAside = commentPanel?.closest('.post-aside');
        const toggle = document.querySelector(`[data-comment-toggle][data-url="${commentPanel?.dataset.url}"]`);
        if (!shell || !postAside) {
            return;
        }

        shell.classList.toggle('show', shouldOpen);
        shell.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
        postAside.classList.toggle('form-open', shouldOpen);
        postAside.style.display = shouldOpen || postAside.dataset.hasComments === 'true' ? 'block' : 'none';
        if (toggle) {
            toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            toggle.classList.toggle('active', shouldOpen);
        }
    }

    function initTwikooForm(commentPanel, formId, postUrl) {
        const formElement = document.getElementById(formId);
        if (!formElement || formElement.dataset.twikooReady === 'true') {
            return;
        }

        formElement.dataset.twikooReady = 'true';
        formElement.innerHTML = '<div class="twikoo-loading">评论表单加载中</div>';

        if (!window.twikoo || typeof window.twikoo.init !== 'function') {
            formElement.innerHTML = '<div class="twikoo-error">评论组件加载失败</div>';
            return;
        }

        try {
            window.twikoo.init({
                envId: memo.twikoo,
                el: `#${formId}`,
                path: postUrl,
                lang: 'zh-CN'
            });
        } catch (error) {
            console.error(error);
            formElement.dataset.twikooReady = 'false';
            formElement.innerHTML = '<div class="twikoo-error">评论表单加载失败</div>';
        }
    }

    function toggleTwikooForm(button, forceOpen) {
        const postUrl = button.dataset.url;
        const formId = button.dataset.target;
        const commentPanel = getCommentPanel(postUrl);
        if (!commentPanel) {
            return;
        }

        const shell = commentPanel.querySelector('[data-comment-form-shell]');
        const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !shell?.classList.contains('show');
        setCommentFormOpen(commentPanel, shouldOpen);
        if (shouldOpen) {
            initTwikooForm(commentPanel, formId, postUrl);
            shell?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    memoDom.addEventListener('click', event => {
        const toggle = event.target.closest('[data-comment-toggle]');
        if (toggle) {
            toggleTwikooForm(toggle);
            return;
        }

        const closeButton = event.target.closest('[data-comment-close]');
        if (closeButton) {
            const toggleButton = document.querySelector(`[data-comment-toggle][data-url="${closeButton.dataset.url}"]`);
            if (toggleButton) {
                toggleTwikooForm(toggleButton, false);
            }
        }
    });

    function removeLoadMoreNav() {
        const oldLoadMoreButton = document.getElementById('load-more');
        if (oldLoadMoreButton) {
            oldLoadMoreButton.closest('.nav-links')?.remove();
        }
    }

    function setListLoading() {
        removeLoadMoreNav();
        memoDom.insertAdjacentHTML('beforeend', loading);
    }

    function animateNewMemos(startIndex) {
        const articles = Array.from(memoDom.querySelectorAll('#posts > article')).slice(startIndex);
        articles.forEach((article, index) => {
            article.classList.add('memo-enter');
            article.style.animationDelay = `${Math.min(index * 45, 270)}ms`;
        });
    }

    function fetchAndDisplayMemos() {
        if (isLoading) {
            return;
        }
        isLoading = true;
        setListLoading();

        fetchMemos().then(data => {
            const memosContainer = memoDom;
            const memosToShow = data.slice(offset, offset + limit);
            const articleCountBeforeInsert = memosContainer.querySelectorAll('#posts > article').length;

            // 移除旧的“加载更多/加载中”区域，避免留下空容器造成额外间距
            memosContainer.querySelector('.nav-links')?.remove();

            // 插入新的内容
            memosContainer.insertAdjacentHTML('beforeend', formatHTML(memosToShow));
            animateNewMemos(articleCountBeforeInsert);
            offset += limit;

            // 仍有更多内容时才插入按钮，避免末尾留下空的 nav-links 高度
            if (offset < data.length) {
                memosContainer.insertAdjacentHTML('beforeend', load);
            }

            // 确保“加载更多”按钮存在后再添加事件监听器
            const loadMoreButton = document.getElementById('load-more');
            if (loadMoreButton) {
                loadMoreButton.removeEventListener('click', fetchAndDisplayMemos); // 移除旧的事件监听器
                loadMoreButton.addEventListener('click', fetchAndDisplayMemos); // 添加新的事件监听器
                loadMoreButton.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        fetchAndDisplayMemos();
                    }
                });
            }

            // 加载 Twikoo 评论
            loadTwikooComments();
        }).catch(error => {
            console.error('Error displaying memos:', error);
            memoDom.querySelector('.nav-links')?.remove();
            memoDom.insertAdjacentHTML('beforeend', load);
        }).finally(() => {
            isLoading = false;
        });
    }

    function loadTwikooComments() {
            const postElements = document.querySelectorAll('.post');
            const postUrls = [];
        
            postElements.forEach(element => {
                const url = element.getAttribute('data-url');
                if (url) {
                    postUrls.push(url);
                }
            });
        
            postUrls.forEach(postUrl => {
                const commentPanel = document.querySelector(`.post[data-url="${postUrl}"]`);
                const commentListElement = commentPanel?.querySelector('.comment-list');
                const commentSummaryElement = commentPanel?.querySelector('.comment-summary');
                if (commentListElement) {
                    commentListElement.innerHTML = ''; // 清除之前的评论
                }
                if (commentSummaryElement) {
                    commentSummaryElement.textContent = '';
                }
        
                // 获取评论数量
                twikoo.getCommentsCount({
                    envId: memo.twikoo,
                    urls: [postUrl],
                    includeReply: false
                }).then(function (countRes) {
                    const commentCount = countRes[0].count;
                    const postAside = commentPanel?.closest('.post-aside');
        
                    if (commentCount === 0) {
                        // 如果没有评论，隐藏评论区域
                        if (postAside) {
                            postAside.dataset.hasComments = 'false';
                            const formShell = commentPanel?.querySelector('[data-comment-form-shell]');
                            postAside.style.display = formShell?.classList.contains('show') ? 'block' : 'none';
                        }
                    } else {
                        // 如果有评论，显示评论区域
                        if (postAside) {
                            postAside.dataset.hasComments = 'true';
                            postAside.style.display = 'block';
                        }
                        if (commentSummaryElement) {
                            commentSummaryElement.textContent = commentCount > 5 ? `最近 5 条 / 共 ${commentCount} 条评论` : `${commentCount} 条评论`;
                        }
        
                        // 获取评论内容
                        twikoo.getRecentComments({
                            envId: memo.twikoo,
                            urls: [postUrl],
                            pageSize: 5,
                            includeReply: false
                        }).then(function (res) {
                            if (!commentListElement) {
                                return;
                            }
                            res.forEach(item => {
                                const li = document.createElement('li');
                                li.classList.add('comment-item');
        
                                const a = document.createElement('a');
                                a.href = item.url || postUrl;
                                a.target = '_blank';
                                a.rel = 'nofollow noopener noreferrer';
        
                                const parser = new DOMParser();
                                const commentFragment = parser.parseFromString(item.comment || '', 'text/html').body;
                                const commentText = commentFragment.textContent.trim();
                                a.title = commentText;

                                const spanAuthor = document.createElement('span');
                                spanAuthor.classList.add('comment-author');
                                spanAuthor.textContent = item.nick || '匿名';
        
                                const spanContent = document.createElement('span');
                                spanContent.classList.add('comment-content');
                                spanContent.textContent = commentText || '（空评论）';
        
                                const spanTime = document.createElement('span');
                                spanTime.classList.add('comment-time');
                                spanTime.textContent = item.relativeTime;

                                const spanMeta = document.createElement('span');
                                spanMeta.classList.add('comment-meta');
                                spanMeta.appendChild(spanAuthor);
                                spanMeta.appendChild(spanTime);

                                a.appendChild(spanMeta);
                                a.appendChild(spanContent);
        
                                li.appendChild(a);
        
                                commentListElement.appendChild(li);
                            });
                        }).catch(function (err) {
                            console.error(err);
                        });
                    }
                }).catch(function (err) {
                    console.error(err);
                });
            });
        }
        
    window.ViewImage && ViewImage.init('.post-content img');
};

function processLinks(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a');
    links.forEach(link => {
        link.target = '_blank';
    });
    return doc.body.innerHTML;
}

