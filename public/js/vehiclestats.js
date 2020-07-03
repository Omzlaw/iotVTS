
const socket = io();
const body = document.getElementById("container");
let mpuData;
socket.on('data', function(statistics) {
  var child = body.lastElementChild;
  if (child) {
    while (child) {
      body.removeChild(child);
      child = body.lastElementChild;
    }
  }

  for (const [key, value] of Object.entries(statistics)) {
    if(key == "MPU_data") {
      mpuData = value;
      continue
    }
    let card = document.createElement("div");
    card.setAttribute("class", "statCard mb-4");
    let cardKey = document.createElement("h2");
    let cardValue = document.createElement("p");
    cardKey.innerText = (key);
    cardValue.innerText = (value);
    body.appendChild(card);
    card.appendChild(cardKey);
    card.appendChild(cardValue);
  }

  for (const [key, value] of Object.entries(mpuData)) {
    let card = document.createElement("div");
    card.setAttribute("class", "statCard mb-4");
    let cardKey = document.createElement("h2");
    let cardValue = document.createElement("p");
    cardKey.innerText = (key);
    cardValue.innerText = (value);
    body.appendChild(card);
    card.appendChild(cardKey);
    card.appendChild(cardValue);
  }
});
