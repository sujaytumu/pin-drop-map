const map = L.map('map').setView([20.5937, 78.9629], 5);

// Custom red pin icon
const redIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});


L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let pins = JSON.parse(localStorage.getItem('pins')) || [];

function savePins() {
  localStorage.setItem('pins', JSON.stringify(pins));
}

function renderPins() {
  const pinList = document.getElementById('pinList');
  pinList.innerHTML = '';
  pins.forEach((pin, index) => {
    const li = document.createElement('li');
    li.className = 'pin-item';
    li.innerHTML = `
      <strong>Remark:</strong> ${pin.remark || 'N/A'}<br>
      <strong>Address:</strong> ${pin.address || 'Fetching...'}<br>
      <strong>Location:</strong> ${pin.location || 'Unknown'}<br>
      <strong>District:</strong> ${pin.district || 'Unknown'}<br>
      <strong>State:</strong> ${pin.state || 'Unknown'}<br>
      <strong>Pincode:</strong> ${pin.pincode || 'N/A'}
    `;
    li.onclick = () => {
      map.setView([pin.lat, pin.lng], 16);
      L.popup().setLatLng([pin.lat, pin.lng]).setContent(pin.remark || 'No remark').openOn(map);
    };
    pinList.appendChild(li);
  });
}

function fetchAddress(lat, lng, callback) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      const address = data.address || {};

      const full = data.display_name || 'Failed';
      const location =
        address.village ||
        address.town ||
        address.city ||
        address.suburb ||
        address.hamlet ||
        'Unknown';

      const district =
        address.county ||
        address.state_district ||
        address.region ||
        address.district ||
        'Unknown';

      const state =
        address.state ||
        address.region ||
        'Unknown';

      const pincode = address.postcode || 'N/A';

      callback({ full, location, pincode, state, district });
    })
    .catch(() => {
      callback({
        full: 'Failed',
        location: 'Unknown',
        pincode: 'N/A',
        state: 'Unknown',
        district: 'Unknown'
      });
    });
}


map.on('click', function (e) {
  const { lat, lng } = e.latlng;
  const popupContent = document.createElement('div');
  const input = document.createElement('input');
  input.placeholder = "Enter remark (optional)";
  input.style.width = "100%";
  const btn = document.createElement('button');
  btn.innerText = "Save Pin";
  btn.style.marginTop = "5px";

  popupContent.appendChild(input);
  popupContent.appendChild(btn);

  const popup = L.popup()
    .setLatLng([lat, lng])
    .setContent(popupContent)
    .openOn(map);

  btn.onclick = () => {
    const remark = input.value.trim();
    const pinData = { lat, lng, remark };
    pins.push(pinData);
    renderPins();
    savePins();
    fetchAddress(lat, lng, ({ full, location, pincode, state, district }) => {
      Object.assign(pinData, {
        address: full,
        location,
        pincode,
        state,
        district
      });
      savePins();
      renderPins();
    });
    map.closePopup();
  };
});

function searchLocation() {
  const query = document.getElementById("locationSearch").value.trim();
  if (!query) return alert("Enter a location to search");

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&accept-language=en`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.length) return alert("Location not found");
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      map.setView([lat, lon], 18);
      fetchAddress(lat, lon, ({ full, location, pincode, state, district }) => {
        const pinData = {
          lat,
          lng: lon,
          remark: query,
          address: full,
          location,
          pincode,
          state,
          district
        };
        pins.push(pinData);
        savePins();
        renderPins();
        L.marker([lat, lon]).addTo(map)
          .bindPopup(`<b>${query}</b><br>${full}`).openPopup();
      });
    })
    .catch(() => alert("Error fetching location"));
}

document.getElementById('clearPinsBtn').onclick = () => {
  if (confirm("Are you sure you want to delete all pins?")) {
    pins = [];
    localStorage.removeItem('pins');
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });
    renderPins();
  }
};

pins.forEach(pin => {
  L.marker([pin.lat, pin.lng]).addTo(map)
    .bindPopup(pin.remark || 'No remark');
});

renderPins();
