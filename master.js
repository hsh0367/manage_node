const cp = require('child_process');
var addon_udp = require('bindings')('addon_udp');

var Queue = require('bull');
var os = require('os');
var addon = require('bindings')('addon');
var job_que = [];
var dataQueue = new Queue('dataQueue');
var jobQueue = new Queue('JobQueue');
var resultQueue = new Queue('resultQueue');
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");
addon_udp.setCallback(2323, data_test);

//test data : sms|data1|data2|data3,call|data1|data2,mp|data1|data2,policy|data1|data2,cnd|data1|data2,etc|data1|data2,lur|data1|data2
var a = 0;
require('date-utils');
var fs = require('fs');
var options = {
  encoding: 'utf8',
  flag: 'a'
};
// var ee = realm.isValid()
// var ss = realm.linkingObject()
// write_log("ee : "+ee)
// console.log("ss : "+ss)
function write_log(data) {
  var dt = new Date();

  var d = dt.toFormat('YYYY-MM-DD HH24:MI:SS');
  var dd = dt.toFormat('YYYY-MM-DD');
  fs.writeFile('./log/master_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}

function data_test(msg) {
  dataQueue.add({
    data: msg
  });
}

function command_classifier(data) {
  switch (data['command']) {
    case 'SMS':
      console.log("send sms_child : ", data);
      write_log("send sms_child : ", data);

      sms_child_test.send({
        data: data
      });
      break;
    case 'CALL':
      console.log("send call_child : ", data);
      write_log("send call_child : ", data);

      call_child_test.send({
        data: data
      });
      break;
    case 'MP':
      console.log("send mp_child : ", data);
      write_log("send mp_child : ", data);

      mp_child_test.send({
        data: data
      });
      break;
    case 'POLICY':
      console.log("send policy_child : " + data['command']);
      write_log("send policy_child : " + data);
      console.log(policy_child_test.connected)

      policy_child_test.send({
        data: data
      });
      break;
    case 'CND':
      console.log("send cnd_child : ", data);
      write_log("send cnd_child : ", data);

      cnd_child_test.send({
        data: data
      });
      break;
    case 'ETC':
      console.log("send etc_child : ", data);
      write_log("send etc_child : ", data);

      etc_child_test.send({
        data: data
      });
      break;
    case 'LUR':
      console.log("send lur_child : ", data);
      write_log("send lur_child : ", data);

      lur_child_test.send({
        data: data
      });
      break;
    default:
      console.log("master : not find command");
      write_log("master : not find command");

  }
}



addon.setCallback(2222, data_test);

dataQueue.process(function(job, done) {
  // console.log("dataQueue")
  var temp = job.data.data

write_log(temp)
  parsing_child_test.send({
    data: temp
  });
  done();
});

jobQueue.process(function(job, done) {

  write_log("jobQueue : ", job.data.msg);
  command_classifier(job.data.msg);
  done();

});
resultQueue.process(function(job, done) {


  var msg = job.data.msg;
  var command = msg.slice(0,2);

  write_log("msg : "+job.data.msg)
  write_log("port : "+job.data.port)

  if(command == "MP"){
    addon_udp.send_data( job.data.msg, job.data.ip, job.data.port)
    write_log("ip : "+job.data.ip)
  }
  else {
    addon.send_data(job.data.port, job.data.msg);
  }

  done();
});
// var parsing_child_test = cp.fork('./child_test/parsing_child_test.js');
// var policy_child_test = cp.fork('./child_test/policy_child_test.js');
// var call_child_test = cp.fork('./child_test/call_child_test.js');
// var cnd_child_test = cp.fork('./child_test/cnd_child_test.js');
// var etc_child_test = cp.fork('./child_test/etc_child_test.js';
// var lur_child_test = cp.fork('./child_test/lur_child_test.js');
// var mp_child_test = cp.fork('./child_test/mp_child_test.js');
// var simAdder_child_test = cp.fork('./child_test/simAdder_child_test.js');
// var sms_child_test = cp.fork('./child_test/sms_child_test.js');


parsing_child()
policy_child()
call_child()
etc_child()
lur_child()
mp_child()
sms_child()

function parsing_child() {
  parsing_child_test = cp.fork("./child_test/parsing_child_test.js", options); //child_process.spawn('node', [nodefile]);
  var job_que = [];
  parsing_child_test.on('message', (value) => {
    job_que = value;
    console.log("recive parsing");
    write_log("recive parsing")

    while (job_que.length > 0) {
      jobQueue.add({
        msg: job_que.shift()
      });
    }
  });
  parsing_child_test.on('exit', function(code) {
    console.log('parsing_child process exited with code ' + code);
    write_log('parsing_child process exited with code ' + code);

    delete parsing_child_test;
    setTimeout(parsing_child, 1000);
  });
}

function policy_child() {

  policy_child_test = cp.fork("./child_test/policy_child_test.js", options); //child_process.spawn('node', [nodefile]);
  policy_child_test.on('message', (value) => {
    //만약 DB CHILD에 넘겨줄 데이터일경우 처리

    console.log(policy_child_test.connected)
    write_log("receive to policy value data : " + value.data);
    write_log("receive to policy port : " + value.port);

    var result = value.data
    var command = result.slice(0, 3);

    if (command == "LUR") { //심구매시 lur시도를 해주어야 하기때문에

      dataQueue.add({
        data: value.data
      });
    }
    else {
      resultQueue.add({
        msg: value.data,
        port: value.port,
      });
    }
  });
  policy_child_test.on('exit', function(code) {
    write_log('policy_child process exited with code ' + code);
    delete policy_child_test;
    setTimeout(policy_child, 1000);
  });
}

function call_child() {
  call_child_test = cp.fork("./child_test/call_child_test.js", options); //child_process.spawn('node', [nodefile]);
  call_child_test.on('message', (value) => {
    console.log("receive to call");
    write_log("receive to call" + value.data)
    var result = value.data

    resultQueue.add({
      msg: value.data,
      port: value.port,
    });

  });
  call_child_test.on('exit', function(code) {
    write_log('call_child process exited with code ' + code);
    delete call_child_test;
    setTimeout(call_child, 1000);
  });
}

function etc_child() {

  etc_child_test = cp.fork("./child_test/etc_child_test.js", options); //child_process.spawn('node', [nodefile]);
  etc_child_test.on('message', (value) => {
    write_log("receive to etc" + value.data);
    write_log("receive to etc" + value.data)
    resultQueue.add({
      msg: value.data,
      port: value.port,
      ip: value.ip
    });
  });
  etc_child_test.on('exit', function(code) {
    write_log('etc_child process exited with code ' + code);
    delete etc_child_test;
    setTimeout(etc_child, 1000);
  });
}

function lur_child() {
  lur_child_test = cp.fork("./child_test/lur_child_test.js", options); //child_process.spawn('node', [nodefile]);
  lur_child_test.on('message', (value) => {
    write_log("receive to etc" +  value.data);
    write_log("receive to etc" +  value.data)
    resultQueue.add({
      msg: value.data,
      port: value.port,
      ip: value.ip
    });
  });
  lur_child_test.on('exit', function(code) {
    write_log('lur_child process exited with code ' + code);
    delete lur_child_test;
    setTimeout(lur_child, 1000);
  });
}

function mp_child() {

  mp_child_test = cp.fork("./child_test/mp_child_test.js", options); //child_process.spawn('node', [nodefile]);
  mp_child_test.on('message', (value) => {
    //만약 DB CHILD에 넘겨줄 데이터일경우 처리

    write_log("receive to mp");
    write_log("receive to mp" + value)

    resultQueue.add({
      msg: value.data,
      port: value.port,
      ip: value.ip
    });

  });
  mp_child_test.on('exit', function(code) {
    write_log('mp_child process exited with code ' + code);
    delete mp_child_test;
    setTimeout(mp_child, 1000);
  });
}

function sms_child() {

  sms_child_test = cp.fork("./child_test/sms_child_test.js", options); //child_process.spawn('node', [nodefile]);
  sms_child_test.on('message', (value) => {
    //만약 DB CHILD에 넘겨줄 데이터일경우 처리

    write_log("receive to sms");
    write_log("receive to sms" + value)

    resultQueue.add({
      msg: value.data,
      port: value.port
    });
  });
  sms_child_test.on('exit', function(code) {
    write_log('sms_child process exited with code ' + code);
    delete sms_child_test;
    setTimeout(sms_child, 1000);
  });
}

//
// parsing_child_test.on('message', (value) => {
//   job_que = value;
//   write_log("recive parsing");
//   write_log("recive parsing")
//
//   while (job_que.length > 0) {
//     jobQueue.add({
//       msg: job_que.shift()
//     });
//   }
// });
// policy_child_test.on('message', (value) => {
//   //만약 DB CHILD에 넘겨줄 데이터일경우 처리
//
//   write_log(policy_child_test.connected)
//
//   write_log("receive to policy" + value);
//   write_log("receive to policy" + value)
//   var command = value.slice(0, 3);
//   if (command == "LUR") { //심구매시 lur시도를 해주어야 하기때문에
//     DataQueue.add({
//       msg: value
//     });
//   }
//   else {
//     resultQueue.add({
//       msg: value
//     });
//   }
// });
// call_child_test.on('message', (value) => {
//   //만약 DB CHILD에 넘겨줄 데이터일경우 처리
//   write_log("receive to call");
//   write_log("receive to call" + value)
//   resultQueue.add({
//     msg: value
//   });
// });
// lur_child_test.on('message', (value) => {
//   //만약 DB CHILD에 넘겨줄 데이터일경우 처리
//
//   write_log("receive to lur");
//   write_log("receive to lur" + value)
//
//   resultQueue.add({
//     msg: value
//   });
//
// });
// sms_child_test.on('message', (value) => {
//   //만약 DB CHILD에 넘겨줄 데이터일경우 처리
//
//   write_log("receive to sms");
//   write_log("receive to sms" + value)
//
//   resultQueue.add({
//     msg: value
//   });
// });
// mp_child_test.on('message', (value) => {
//   //만약 DB CHILD에 넘겨줄 데이터일경우 처리
//
//   write_log("receive to mp");
//   write_log("receive to mp" + value)
//
//   resultQueue.add({
//     msg: value
//   });
//
// });
// etc_child_test.on('message', (value) => {
//   //만약 DB CHILD에 넘겨줄 데이터일경우 처리
//
//   write_log("receive to etc" + value);
//   write_log("receive to etc" + value)
//
//   resultQueue.add({
//     msg: value
//   });
// });
