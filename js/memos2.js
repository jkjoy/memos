const memo = {
    host: 'https://memos.ee', // 确保这个值是正确的
    limit: '100',
    creatorId: '1',
    domId: '#posts'
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
                    resourceElement += `<figure class="picture-container"><img src="${imageUrl}" data-fancybox="img" class="img-thumbnail"> </figure>`;
                    imageCount++;
                }
        
                if (resources && resources.length > 0) {
                    resources.forEach(resource => {
                        if (resource.externalLink) {
                            // 检查链接是否为图片文件
                            if (/\.(jpeg|jpg|gif|png|bmp|webp)/i.test(resource.externalLink)) {
                                resourceElement += `
                                <figure class="picture-container">
                                    <img class="img-thumbnail" src="${resource.externalLink}" />
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
                                resourceElement += `
                                <div class="picture-container">
                                <a href="${resourceUrl}" target="_blank">
                                <img src="${resourceUrl}" class="img-thumbnail">
                                </a></div>
                                `;
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
       <div class="talks row g-0 flex-md-row-reverse">
        <div class="col-md-12 ">
          <div class="card-body d-flex flex-column">
            <div class="card-text content mt-0 mb-3">
              <p> ${processedContent}</p> <br>
                 </div>
                 <div class="inner ${gridClass}">
                 <div class="gallery">
                              ${resourceElement}  
                    </div>  </div>    
            <div class="post-meta flex-grow-1 d-flex align-items-end">
              <div class="me-auto">
                <i class="far fa-calendar fa-fw me-1"></i>
                <a href="${getMemoUrl(uid)}" target="_blank">
<time
  data-ts="${new Date(createTime).toLocaleString()}"
  data-df="YYYY/MM/DD"
>
${new Date(createTime).toLocaleString()}
</time>      </a>
              </div>
            </div>
          </div>
        </div></div>
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
    window.ViewImage && ViewImage.init('.inner img');
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

function insertCSS(cssCode) {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = cssCode;
    document.head.appendChild(style);
}
const cssCode = `
  .nav-links {
    display: grid; /* 使用 Grid 布局 */
    place-items: center; /* 水平和垂直居中 */
    width: 100%; /* 设置宽度 */
    height: 50px; /* 设置高度，根据需要调整 */
}

div pre code {
  white-space: pre-wrap; /* CSS3 */
  overflow-wrap: break-word;  
  word-break: break-all;  
  word-break: break-word;  
}
div p a {
  word-break: break-all;  
  word-break: break-word;  
}
img {
  object-fit: cover;
  object-position: center;
} 

.inner .gallery {
    width: 90%;
    display: flex;
    flex-flow: wrap;
    gap: 5px 10px;
    padding-bottom: 15px;
  }
  
  .inner .gallery .picture-container {
    min-width: 200px;
    flex: 0 0 calc(33.333% - 13.333px);
    aspect-ratio: 1 / 1; 
  }
  
  @media screen and (max-width: 736px) {
    .inner .gallery .picture-container {
      flex: 0 0 calc(50% - 20px);
    }
  }
  
  @media screen and (max-width: 480px) {
    .inner .gallery .picture-container {
      flex: 0 0 100%;
    }
  }
  
  .inner .gallery .picture-container a {
    border: none;
    display: block;
    width: 100%;
    height: 100%;
  }
  
  .inner .gallery .picture-container a .img-thumbnail {
    border-radius: 4px;
    width: 100%;
    height: 100%;
    object-fit: cover; 
    object-position: center;  
  }
.talks{border:0;background:var(--card-bg);box-shadow:var(--card-shadow)}  
`;
insertCSS(cssCode);
