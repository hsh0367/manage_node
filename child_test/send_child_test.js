process.on('message', (value) => {
  var temp = [];
  temp = parser(value.data);
  console.log("parsing : ", temp);
  process.send(temp);
});
