// YouTube IFrame Player API 관련 변수 선언
let player;
let isPlayerReady = false;
let scrollThrottleTimer = null;

// YouTube API가 준비되면 호출되는 함수
function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API 준비 완료');
    isPlayerReady = true;

    // 플레이어 생성
    player = new YT.Player('videoPlayer', {
        height: '100%',
        width: '100%',
        playerVars: {
            'autoplay': 0,
            'rel': 0,
            'modestbranding': 1,
            'enablejsapi': 1,
            'controls': 1,
            'fs': 1,
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

// 플레이어가 준비되면 호출되는 함수
function onPlayerReady(event) {
    console.log('플레이어 준비 완료');
}

// 플레이어 상태가 변경되면 호출되는 함수
function onPlayerStateChange(event) {
    // 동영상이 종료되면 다음 동영상 재생
    if (event.data === YT.PlayerState.ENDED) {
        console.log('비디오 재생 완료, 다음 비디오로 이동합니다.');
        nextVideo();
    }

    // 재생 상태 변경 시 UI 업데이트 시 스크롤 최적화 적용
    if (event.data === YT.PlayerState.PLAYING) {
        optimizePlaylistScroll();
    }
}

// 플레이어 오류 발생 시 호출되는 함수
function onPlayerError(event) {
    console.error('플레이어 오류:', event.data);

    // 오류 코드 분석
    let errorMessage = "동영상 재생 중 오류가 발생했습니다.";
    switch (event.data) {
        case 2:
            errorMessage = "잘못된 동영상 ID입니다.";
            break;
        case 5:
            errorMessage = "HTML5 플레이어 관련 오류가 발생했습니다.";
            break;
        case 100:
            errorMessage = "요청한 동영상을 찾을 수 없습니다.";
            break;
        case 101:
        case 150:
            errorMessage = "동영상 소유자가 내장 플레이어에서 재생을 허용하지 않습니다.";
            break;
    }

    showToast(errorMessage);

    // 현재 비디오에 오류 표시
    if (playlistInfo && playlistInfo[currentVideoIndex]) {
        playlistInfo[currentVideoIndex].eventError = true;
        displayPlaylistInfo(playlistInfo, document.getElementById('playlistTitle').textContent);
    }

    // 다음 동영상으로 이동
    setTimeout(() => {
        nextVideo();
    }, 2000);
}

// 비디오 재생 함수 - YouTube API를 활용하도록 수정
function playVideo(videoUrl) {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
        console.error("유효한 비디오 ID를 찾을 수 없습니다:", videoUrl);
        return;
    }

    console.log('재생 요청된 비디오 ID:', videoId);

    if (!isPlayerReady || !player) {
        console.log('플레이어가 준비되지 않았습니다. 플레이어를 초기화합니다.');

        // 플레이어가 준비되지 않았다면 초기화 후 로드
        const videoPlayer = document.getElementById('videoPlayer');
        if (!videoPlayer) {
            console.error("videoPlayer 컨테이너를 찾을 수 없습니다.");
            return;
        }

        videoPlayer.innerHTML = '';

        player = new YT.Player('videoPlayer', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'autoplay': 1,
                'rel': 0,
                'modestbranding': 1,
                'enablejsapi': 1,
                'controls': 1,
                'fs': 1,
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });

        isPlayerReady = true;
    } else {
        // 이미 플레이어가 존재한다면 loadVideoById로 새 비디오 로드
        console.log('기존 플레이어로 비디오를 로드합니다:', videoId);
        player.loadVideoById(videoId);
    }
}

// 스크롤 성능 최적화 함수
function optimizePlaylistScroll() {
    // 플레이리스트 컨테이너 찾기
    const playlistContainer = document.querySelector('.playlist-container');
    if (!playlistContainer) return;

    // passive 옵션으로 스크롤 이벤트 리스너 설정
    playlistContainer.addEventListener('scroll', throttleScroll, { passive: true });

    // CSS 최적화 적용
    playlistContainer.style.willChange = 'transform';
    playlistContainer.style.transform = 'translateZ(0)';

    // 플레이리스트 아이템에 최적화 적용
    const playlistItems = document.querySelectorAll('.playlist-item');
    playlistItems.forEach(item => {
        item.style.willChange = 'transform';
        item.style.transform = 'translateZ(0)';
    });
}

// 스크롤 쓰로틀링 함수
function throttleScroll(event) {
    if (!scrollThrottleTimer) {
        scrollThrottleTimer = setTimeout(() => {
            scrollThrottleTimer = null;
            updateVisibleItems(event);
        }, 100); // 100ms 지연
    }
}

// 화면에 보이는 항목만 업데이트
function updateVisibleItems(event) {
    const container = event.target;
    const items = container.querySelectorAll('.playlist-item');

    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;

    items.forEach(item => {
        const itemTop = item.offsetTop;
        const itemBottom = itemTop + item.offsetHeight;

        // 화면에 보이는 항목만 고품질로 렌더링
        if (itemBottom >= containerTop && itemTop <= containerBottom) {
            if (item.style.opacity !== '1') {
                item.style.opacity = '1';
                item.style.transform = 'translateZ(0)';
            }
        } else {
            // 화면 밖 항목은 최적화
            if (item.style.opacity !== '0.8') {
                item.style.opacity = '0.8';
                item.style.transform = 'none';
            }
        }
    });
}

// 플레이리스트 정보 표시 함수 래퍼 (기존 함수가 있다고 가정)
const originalDisplayPlaylistInfo = typeof displayPlaylistInfo === 'function' ? displayPlaylistInfo : null;

// 기존 displayPlaylistInfo 함수를 최적화된 버전으로 교체
if (originalDisplayPlaylistInfo) {
    window.displayPlaylistInfo = function (playlistInfo, title) {
        // 원래 함수 호출
        originalDisplayPlaylistInfo(playlistInfo, title);
        // 스크롤 최적화 적용
        setTimeout(optimizePlaylistScroll, 0);
    };
}

function initYouTubePlayer(videoId) {
    if (!window.YT || !YT.Player) {
        console.error("YouTube IFrame API가 로드되지 않았습니다.");
        return;
    }
    player = new YT.Player('videoPlayer', {
        videoId: videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
            onReady: () => { /* ...existing code... */ },
            onError: () => { console.error("동영상 재생 오류"); }
        }
    });
}
