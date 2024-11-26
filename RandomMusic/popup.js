document.addEventListener('DOMContentLoaded', function () {
    const randomButton = document.getElementById('randomButton');
    const playlistButton = document.getElementById('playlistButton');
    const playlistDiv = document.getElementById('playlist');
    const filterSelect = document.getElementById('filterSelect');
    const feedbackQuestion = document.getElementById('feedbackQuestion');
    const thumbsUpButton = document.getElementById('thumbsUpButton');
    const thumbsDownButton = document.getElementById('thumbsDownButton');
    const viewCountInput = document.getElementById('viewCountInput');
  
    // Load selected filter from localStorage if it exists
    if (localStorage.getItem('selectedFilter')) {
      filterSelect.value = localStorage.getItem('selectedFilter');
    }
  
    if (localStorage.getItem('viewCountFilter')) {
      viewCountInput.value = localStorage.getItem('viewCountFilter');
    }
  
    // Load last recommended video from localStorage if it exists
    if (localStorage.getItem('lastVideoId')) {
      const lastVideoId = localStorage.getItem('lastVideoId');
      const lastVideoTitle = localStorage.getItem('lastVideoTitle');
      showFeedbackOptions({ id: { videoId: lastVideoId }, snippet: { title: lastVideoTitle } });
    }
  
    randomButton.addEventListener('click', async () => {
      try {
        const video = await getRandomMusicVideo();
        if (video) {
          chrome.tabs.update({ url: `https://www.youtube.com/watch?v=${video.id.videoId}` });
          localStorage.setItem('lastVideoId', video.id.videoId);
          localStorage.setItem('lastVideoTitle', video.snippet.title);
          showFeedbackOptions(video);
        }
      } catch (error) {
        console.error('Error fetching random video:', error);
      }
    });
  
    // Save selected filter to localStorage
    filterSelect.addEventListener('change', () => {
      localStorage.setItem('selectedFilter', filterSelect.value);
    });
  
    viewCountInput.addEventListener('change', () => {
      localStorage.setItem('viewCountFilter', viewCountInput.value);
    });
  
    playlistButton.addEventListener('click', () => {
      playlistDiv.style.display = playlistDiv.style.display === 'none' ? 'block' : 'none';
    });
  
    loadPlaylist();
  });
  
  async function getRandomMusicVideo() {
    const apiKey = 'YOUR_API_KEY';
    const query = 'music';
    const maxResults = 10;
    const filter = localStorage.getItem('selectedFilter') || '';
    const viewCountFilter = parseInt(localStorage.getItem('viewCountFilter'), 10) || null;
    const previouslyRecommended = JSON.parse(localStorage.getItem('previouslyRecommended')) || [];
  
    let publishedAfter = '';
    let publishedBefore = '';
    switch (filter) {
      case '7days':
        publishedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30days':
        publishedBefore = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '1year':
        publishedBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        publishedAfter = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '3years':
        publishedBefore = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        publishedAfter = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '10years':
        publishedBefore = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString();
        publishedAfter = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
        break;
    }
  
    try {
      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${query}&type=video&videoCategoryId=10&key=${apiKey}`;
      if (publishedAfter) {
        url += `&publishedAfter=${publishedAfter}`;
      }
      if (publishedBefore) {
        url += `&publishedBefore=${publishedBefore}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      let videos = data.items;
  
      // Filter out previously recommended videos
      videos = videos.filter(video => !previouslyRecommended.includes(video.id.videoId));
  
      // If view count filter is set, retrieve video statistics
      if (viewCountFilter !== null && !isNaN(viewCountFilter)) {
        const videoIds = videos.map(video => video.id.videoId).join(',');
        const videoDetails = await getVideoDetails(videoIds);
        videos = videos.filter((video, index) => videoDetails[index] && parseInt(videoDetails[index].statistics.viewCount, 10) <= viewCountFilter);
      }
  
      if (videos.length > 0) {
        const randomIndex = Math.floor(Math.random() * videos.length);
        const selectedVideo = videos[randomIndex];
        previouslyRecommended.push(selectedVideo.id.videoId);
        localStorage.setItem('previouslyRecommended', JSON.stringify(previouslyRecommended));
        return selectedVideo;
      }
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
    }
    return null;
  }
  
  async function getVideoDetails(videoIds) {
    const apiKey = 'AIzaSyDDj5ZhtXWdlpzVr3snkIyIKUnDpoK0Ej8';
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.items;
    } catch (error) {
      console.error('Error fetching video details:', error);
      return [];
    }
  }
  
  function loadPlaylist() {
    const playlist = JSON.parse(localStorage.getItem('musicPlaylist')) || [];
    const playlistDiv = document.getElementById('playlist');
    playlistDiv.innerHTML = '';
  
    if (playlist.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.textContent = '노래가 없어요. 마음에 드는 노래를 추가하세요.';
      playlistDiv.appendChild(emptyMessage);
    } else {
      playlist.forEach((video, index) => {
        const videoElement = document.createElement('div');
        videoElement.textContent = video.title;
        videoElement.className = 'playlist-item';
        videoElement.style.position = 'relative';
        videoElement.addEventListener('click', (event) => {
          if (!event.target.classList.contains('delete-button')) {
            chrome.tabs.update({ url: `https://www.youtube.com/watch?v=${video.videoId}` });
          }
        });
        videoElement.addEventListener('mouseover', () => {
          videoElement.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.2)';
          videoElement.style.backgroundColor = '#f0f0f0';
        });
        videoElement.addEventListener('mouseout', () => {
          videoElement.style.boxShadow = 'none';
          videoElement.style.backgroundColor = 'white';
        });
        videoElement.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          showDeleteOption(videoElement, index);
        });
        playlistDiv.appendChild(videoElement);
      });
    }
  }
  
  function showDeleteOption(videoElement, index) {
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '삭제';
    deleteButton.className = 'delete-button';
    deleteButton.style.position = 'absolute';
    deleteButton.style.backgroundColor = 'red';
    deleteButton.style.color = 'white';
    deleteButton.style.padding = '3px 7px';
    deleteButton.style.border = 'none';
    deleteButton.style.borderRadius = '3px';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.fontSize = '18px';
    deleteButton.style.fontWeight = 'bold';
    deleteButton.style.width = 'auto';
    deleteButton.style.height = 'auto';
    deleteButton.style.top = '50%';
    deleteButton.style.right = '10px';
    deleteButton.style.transform = 'translateY(-50%)';
  
    deleteButton.addEventListener('click', () => {
      deleteFromPlaylist(index);
    });
  
    videoElement.appendChild(deleteButton);
  
    videoElement.addEventListener('mouseleave', () => {
      if (videoElement.contains(deleteButton)) {
        videoElement.removeChild(deleteButton);
      }
    });
  }
  
  function deleteFromPlaylist(index) {
    const playlist = JSON.parse(localStorage.getItem('musicPlaylist')) || [];
    playlist.splice(index, 1);
    localStorage.setItem('musicPlaylist', JSON.stringify(playlist));
    loadPlaylist();
  }
  
  function showFeedbackOptions(video) {
    feedbackQuestion.style.display = 'block';
    thumbsUpButton.style.display = 'inline-block';
    thumbsDownButton.style.display = 'inline-block';
    thumbsUpButton.style.backgroundColor = 'blue';
    thumbsUpButton.style.color = 'white';
    thumbsUpButton.style.padding = '10px';
    thumbsUpButton.style.borderRadius = '5px';
    thumbsUpButton.style.fontSize = '16px';
    thumbsUpButton.style.fontWeight = 'bold';
    thumbsDownButton.style.backgroundColor = 'red';
    thumbsDownButton.style.color = 'white';
    thumbsDownButton.style.padding = '10px';
    thumbsDownButton.style.borderRadius = '5px';
    thumbsDownButton.style.fontSize = '16px';
    thumbsDownButton.style.fontWeight = 'bold';
  
    thumbsUpButton.onclick = () => {
      addToPlaylist(video.id.videoId, video.snippet.title);
      localStorage.removeItem('lastVideoId');
      localStorage.removeItem('lastVideoTitle');
      hideFeedbackOptions();
      console.log('Liked video added to playlist:', video.snippet.title);
      loadPlaylist();
    };
  
    thumbsDownButton.onclick = () => {
      localStorage.removeItem('lastVideoId');
      localStorage.removeItem('lastVideoTitle');
      hideFeedbackOptions();
    };
  }
  
  function addToPlaylist(videoId, title) {
    const playlist = JSON.parse(localStorage.getItem('musicPlaylist')) || [];
    const videoExists = playlist.some(video => video.videoId === videoId);
    if (!videoExists) {
      playlist.push({ videoId, title });
      localStorage.setItem('musicPlaylist', JSON.stringify(playlist));
      loadPlaylist();
    }
  };
  
    thumbsDownButton.onclick = () => {
      localStorage.removeItem('lastVideoId');
      localStorage.removeItem('lastVideoTitle');
      hideFeedbackOptions();
    };
  
  
  function hideFeedbackOptions() {
    feedbackQuestion.style.display = 'none';
    thumbsUpButton.style.display = 'none';
    thumbsDownButton.style.display = 'none';
  }
  