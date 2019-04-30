function parser(data) {
  console.log("paser start")
  var str = data;
  var command_divied = str.split(",");
  var job_que = [];
  command_divied.forEach(function(dummy) {
    var parser_data = dummy.split("|");
    var dict = {};
    for (var i = 0; i < parser_data.length-1; i++) {
      if (i === 0) { //command
        dict["command"] = parser_data[0];
      } else {
        dict["data" + i] = parser_data[i];
      }
    }
    if(Object.keys(dict).length>0){

      job_que.push(dict);
    }
  });
  return job_que;
};
process.on('message', (value) => {
  var temp = [];
  temp = parser(value.data);
  console.log("parsing : ", temp);
  process.send(temp);
});
