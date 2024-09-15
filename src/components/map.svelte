<script lang="js">
  import { Loader } from '@googlemaps/js-api-loader';

  const loader = new Loader({
      apiKey: "Put your API",
      version: "weekly",
      libraries: ["places"]
  });

  const mapOptions = {
      center: { lat: 0, lng: 0 },
      zoom: 4
  };

  let map;
  let markers = {}; // 위치별 마커 관리 객체

  // 지도 생성
  loader.importLibrary('maps')
      .then(({ Map }) => {
          map = new Map(document.getElementById("map"), mapOptions);

          // 지도 클릭 이벤트 핸들러
          map.addListener('click', function (e) {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;

              if (markers[key]) {
                  // 이미 마커가 있으면, 마커를 숨김
                  markers[key].setVisible(false);
                  console.log(11);

              } else {
                  // 새로운 마커 추가
                  addMarker({ lat, lng }, key);
              }
          });
      })
      .catch((e) => {
          console.error(e);
      });

  // 마커 추가 함수
  function addMarker(position, key) {
      loader.importLibrary('marker').then(({ Marker }) => {
          const marker = new Marker({
              position,
              map: map,
              title: `Marker at ${position.lat}, ${position.lng}`,
              draggable: true
          });

          // 마커 클릭 이벤트 리스너 추가 (클릭 시 마커 숨기기)
          marker.addListener('click', function () {
              marker.setVisible(false); // 마커 숨기기
          });

          // 마커를 markers 객체에 저장
          markers[key] = marker;
      });
  }
</script>

<div id="map"></div>

<style>
  #map {
      height: 400px;
      width: 100%;
  }
</style>