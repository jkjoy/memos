const memo = {
    host: 'https://memos.ee', // 确保这个值是正确的
    limit: '100',
    creatorId: '1',
    domId: '#posts',
};

if (typeof memos !== "undefined") {
    for (let key in memos) {
        if (memos[key]) {
            memo[key] = memos[key];
        }
    }
}
var memohost = memo.host.replace(/\/$/, '')
window.onload = function() {
    let offset = 0;
    const limit = 10;
    let avatarurl, memoname, userurl, description;

    // 获取用户信息
    fetch(`${memo.host}/api/v1/users/${memo.creatorId}`)
       .then(response => response.json())
       .then(userData => {
            avatarurl = `${memo.host}${userData.avatarUrl}`;
            memoname = userData.nickname;
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

    function formatHTML(memosData) {
        let htmlString = '';
        memosData.forEach(memo => {
            const { content, resources, uid, createTime } = memo;
            let resourceElement = '';
            let imageCount = 0;

            // 尝试从 memo 内容中匹配图片 URL
            const imageUrlMatch = content.match(/\((https?.+?\.(?:jpeg|jpg|gif|png))\)/i);
            let imageUrl = "";
            if (imageUrlMatch && imageUrlMatch.length > 1) {
                imageUrl = imageUrlMatch[1];
                resourceElement += `<figure class="gallery-thumbnail aspectratio" style="--aspectratio: 3024 / 4032;"><img src="${imageUrl}" data-fancybox="img" class="thumbnail-image g-alias-imgblock"> </figure>`;
                imageCount++;
            }
 
            if (resources && resources.length > 0) {
                resources.forEach(resource => {
                    
                    if (resource.externalLink && !imageUrl) {
                        // 检查链接是否为图片文件
                        if (/\.(jpeg|jpg|gif|png|bmp|webp)/i.test(resource.externalLink)) {
                            resourceElement += `<figure class="gallery-thumbnail aspectratio" style="--aspectratio: 4032 / 3024;">
                                        <img class="thumbnail-image g-alias-imgblock" src="${resource.externalLink}" data-fancybox="img" />
                                    </figure>
                                  `;
                            imageCount++;
                        } else {
                            resourceElement += `<a href="${resource.externalLink}" target="_blank">点击下载</a>`;
                        }
                    } else if (!resource.externalLink) {
                       
                        const  resourceUrl = `${memohost}/file/${resource.name}/${resource.filename}`;
                        // 检查链接是否为图片文件
                        if (/\.(jpeg|jpg|gif|png|bmp|webp)/i.test(resourceUrl)) {
                            resourceElement += `<a href="${resourceUrl}" target="_blank"><img src="${resourceUrl}" data-fancybox="img" class="thumbnail-image g-alias-imgblock"></a>`;
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
            const htmlContent = marked.parse(content.replace(/#(.*?)\s/g, '')
               .replace(/\!?\[(.*?)\]\((.*?)\)/g, ''));
            const processedContent = processLinks(htmlContent);

            // 创建 memo HTML 字符串，包括图片和内容
            htmlString += `
             <article id="post-${uid}" class="g-clear-both">
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
                    <footer class="post-footer g-clear-both">
                        <div class="post-info g-left g-txt-ellipsis">
                        <a href="${getMemoUrl(uid)}" target="_blank">   
                            <span clsss="post-date">${new Date(createTime).toLocaleString()}</span>
                        </a>
                        </div>
                    </footer>
                </div>
            </article>`;
        });
        return htmlString;
    }

    function fetchMemos() {
        return fetch(`${memo.host}/api/v1/memos?pageSize=${memo.limit}&filter=visibilities%20==%20[%27PUBLIC%27]%20%26%26%20creator%20==%20%27users/${memo.creatorId}%27`)
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
            memosContainer.innerHTML += formatHTML(memosToShow);
            offset += limit;
            // 如果没有更多的 memos，隐藏“加载更多”按钮
            if (offset >= data.length) {
                document.getElementById('load-more').style.display = 'none';
            }
        });
    }

    // 绑定“加载更多”按钮的点击事件
    document.getElementById('load-more').addEventListener('click', fetchAndDisplayMemos);

    // Fancybox 初始化
    Fancybox.bind("[data-fancybox]", {
        // Your custom options
    });
};

function getMemoUrl(uid) {
    if (uid && memo.host) {
        return `${memo.host}/m/${uid}`;
    } else {
        return '#';
    }
}

function processLinks(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a');
    links.forEach(link => {
        link.target = '_blank';
    });
    return doc.body.innerHTML;
}