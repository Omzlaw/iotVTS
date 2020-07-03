let socket = io();
let attribute = "";
socket.on("image", function(data){
  attribute = "";
  for(i=0; i<data.length;i++) {
    attribute += data[i];
  }
  document.getElementsByClassName("button")[0].setAttribute("href", attribute);
});
