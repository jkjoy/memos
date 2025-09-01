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
var load = '<div class="nav-links"><span id="load-more" class="loadmore">加载更多</span></div>'

window.onload = function() {
    let offset = 0;
    const limit = 10;
    let avatarurl, memoname, userurl, description;

    // 获取用户信息
    fetch(`${memo.host}/api/v1/users/${memo.creatorId}`)
       .then(response => response.json())
       .then(userData => {
            avatarurl = `${memo.host}${userData.avatarUrl}`;
            memoname = userData.displayName;
            userurl = `${memo.host}/u/${userData.username}`;
            description = userData.description;

            // 更新 banner 信息
            const bannerSubinfo = document.getElementById('banner-subinfo');
            bannerSubinfo.textContent = description;
            const bannerBackground = document.getElementById('banner-background');
            bannerBackground.style.backgroundImage = 'url("https://pic.0tz.top/api")';
            const avatarImg = document.querySelector('.avatar.g-right img.g-alias-imgblock');
            avatarImg.src = avatarurl;

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
                const { content, resources, uid, createTime } = memo;
                let resourceElement = '';
                let imageCount = 0;
        
                const locationHtml = getLocationHtml(memo.location);
                const formatteduid = memo.name.split('/')[1];
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
                        if (resource.externalLink) {
                            // 检查链接是否为图片文件
                            if (/\.(jpeg|jpg|gif|png|bmp|webp)/i.test(resource.externalLink)) {
                                resourceElement += `
                                <figure class="gallery-thumbnail aspectratio" style="--aspectratio: 4032 / 3024;">
                                    <img class="thumbnail-image g-alias-imgblock" src="${resource.externalLink}" />
                                </figure>
                                `;
                                imageCount++;
                            } else {
                                resourceElement += `<a href="${resource.externalLink}" target="_blank">点击下载</a>`;
                            }
                        } else {
                            const resourceUrl = `${memohost}/file/${resource.name}/${resource.filename}`;
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
                        <a href="${memohost}/m/${formatteduid}" target="_blank">   
                            <span clsss="post-date">${new Date(createTime).toLocaleString()}</span>                            
                        </a>
                        <div class="post-fun g-right">
                        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" baseProfile="full" width="20" height="20" viewBox="0 0 512 512"><g><circle r="50" cy="255" cx="355" fill="#576b95" /><circle r="50" cy="255" cx="155" fill="#576b95" /></g></svg>
                        </div>
                        </div>
                    </footer>
                    <aside class="post-aside show">
                            <div class="fun-area post-comment g-clear-both index show">
                                <div data-url="${memohost}/m/${formatteduid}" class="post">
                                <ul class="comment-list"></ul>
                                </div> 
                            </div>
                        </aside>
                </div>
            </article>`;
        });
        return htmlString;
    }

    function fetchMemos() {
        return fetch(`${memo.host}/api/v1/memos?pageSize=${memo.limit}&parent=users/${memo.creatorId}`)
           .then(response => response.json())
           .then(data => data.memos)
           .catch(error => {
                console.error('Error fetching memos:', error);
                return [];
            });
    }

    var memoDom = document.querySelector(memo.domId);
    if (memoDom) {}

    function fetchAndDisplayMemos() {
        fetchMemos().then(data => {
            const memosContainer = memoDom;
            const memosToShow = data.slice(offset, offset + limit);
            // 移除旧的“加载更多”按钮
            const oldLoadMoreButton = document.getElementById('load-more');
            if (oldLoadMoreButton) {
                oldLoadMoreButton.remove();
            }

            // 插入新的内容
            memosContainer.insertAdjacentHTML('beforeend', formatHTML(memosToShow));
            offset += limit;

            // 插入新的“加载更多”按钮
            memosContainer.insertAdjacentHTML('beforeend', load);

            // 如果没有更多的 memos，隐藏“加载更多”按钮
            if (offset >= data.length) {
                document.getElementById('load-more').style.display = 'none';
            }

            // 确保“加载更多”按钮存在后再添加事件监听器
            const loadMoreButton = document.getElementById('load-more');
            if (loadMoreButton) {
                loadMoreButton.removeEventListener('click', fetchAndDisplayMemos); // 移除旧的事件监听器
                loadMoreButton.addEventListener('click', fetchAndDisplayMemos); // 添加新的事件监听器
            }

            // 加载 Twikoo 评论
            loadTwikooComments();
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
                const commentListElement = document.querySelector(`[data-url="${postUrl}"] .comment-list`);
                if (commentListElement) {
                    commentListElement.innerHTML = ''; // 清除之前的评论
                }
        
                // 获取评论数量
                twikoo.getCommentsCount({
                    envId: memo.twikoo,
                    urls: [postUrl],
                    includeReply: false
                }).then(function (countRes) {
                    const commentCount = countRes[0].count;
                    const postAside = document.querySelector(`[data-url="${postUrl}"]`).closest('.post-aside');
        
                    if (commentCount === 0) {
                        // 如果没有评论，隐藏评论区域
                        if (postAside) {
                            postAside.style.display = 'none';
                        }
                    } else {
                        // 如果有评论，显示评论区域
                        if (postAside) {
                            postAside.style.display = 'block';
                        }
        
                        // 获取评论内容
                        twikoo.getRecentComments({
                            envId: memo.twikoo,
                            urls: [postUrl],
                            pageSize: 5,
                            includeReply: false
                        }).then(function (res) {
                            res.forEach(item => {
                                const li = document.createElement('li');
        
                                const a = document.createElement('a');
                                a.href = item.url;
                                a.title = item.comment;
        
                                const parser = new DOMParser();
                                const commentFragment = parser.parseFromString(item.comment, 'text/html').body;
                                a.textContent = item.nick + ': ' + commentFragment.textContent;
        
                                const spanContent = document.createElement('span');
                                spanContent.classList.add('comment-content');
                                spanContent.appendChild(a);
        
                                const spanTime = document.createElement('span');
                                spanTime.classList.add('comment-time');
                                spanTime.textContent = item.relativeTime;
        
                                li.appendChild(spanContent);
                                li.appendChild(spanTime);
        
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

