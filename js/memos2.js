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
            memoname = userData.nickname;
            userurl = `${memo.host}/u/${userData.username}`;
            description = userData.description;

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
    <article class="card-wrapper card">
      <a href="${getMemoUrl(uid)}" class="post-preview row g-0 flex-md-row-reverse">
        <div class="col-md-12">
          <div class="card-body d-flex flex-column">
            <div class="card-text content mt-0 mb-3">
 <p> ${processedContent}</p>        <div class="post-content-gallery ${gridClass}">
                              ${resourceElement}     
                        </div>
            </div>
            <div class="post-meta flex-grow-1 d-flex align-items-end">
              <div class="me-auto">
                <!-- posted date -->
                <i class="far fa-calendar fa-fw me-1"></i>
<time
  data-ts="${new Date(createTime).toLocaleString()}"
  data-df="YYYY/MM/DD"
>
${new Date(createTime).toLocaleString()}
</time>   
              </div>
            </div>
          </div>
        </div>
      </a>
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
        });
    }  
    window.ViewImage && ViewImage.init('.post-content img');
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