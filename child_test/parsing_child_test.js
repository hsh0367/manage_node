console.log("[PARSING] ON")
function parser(data) {
  console.log("paser start")
  var str = data;
  console.log("PARSING : "+data)

  var temp = str.split("$")
  var port = temp[1];
  var command_divied =  temp[0].split(",");
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
      dict['port'] = port;
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
