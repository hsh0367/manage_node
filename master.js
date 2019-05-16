const cp = require('child_process');
var Queue = require('bull');
var os = require('os');
var addon = require('bindings')('addon');
var job_que = [];
var dataQueue = new Queue('DataQueue');
var jobQueue = new Queue('JobQueue');
var resultQueue = new Queue('resultQueue');
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");

//test data : sms|data1|data2|data3,call|data1|data2,mp|data1|data2,policy|data1|data2,cnd|data1|data2,etc|data1|data2,lur|data1|data2
var a = 0;

function data_test(msg) {
  dataQueue.add({
    data: msg
  });
}

function command_classifier(data) {
  switch (data['command']) {
    case 'SMS':
      console.log("send sms_child : ", data);
      sms_child_test.send({
        data: data
      });
      break;
    case 'CALL':
      console.log("send call_child : ", data);
      call_child_test.send({
        data: data
      });
      break;
    case 'MP':
      console.log("send mp_child : ", data);
      mp_child_test.send({
        data: data
      });
      break;
    case 'POLICY':
      console.log("send policy_child : ", data);
      policy_child_test.send({
        data: data
      });
      break;
    case 'CND':
      console.log("send cnd_child : ", data);
      cnd_child_test.send({
        data: data
      });
      break;
    case 'ETC':
      console.log("send etc_child : ", data);
      etc_child_test.send({
        data: data
      });
      break;
    case 'LUR':
      console.log("send lur_child : ", data);
      lur_child_test.send({
        data: data
      });
      break;
    case 'DB':
      console.log("send db_child : ", data);
      DB_test.send({
        data: data
      });
      break;
    default:
      console.log("master : not find command");
  }
}



addon.setCallback(2222, data_test);

dataQueue.process(function(job, done) {
  // console.log("dataQueue")
  var temp = job.data.data
  parsing_child_test.send({
    data: temp
  });
  done();
});

jobQueue.process(function(job, done) {

  console.log("jobQueue : ", job.data.msg);
  command_classifier(job.data.msg);
  done();
});
resultQueue.process(function(job, done) {

  addon.send_data(job.data.msg);
  done();
});
const parsing_child_test = cp.fork('./child_test/parsing_child_test.js');
const call_child_test = cp.fork('./child_test/call_child_test.js');
const cnd_child_test = cp.fork('./child_test/cnd_child_test.js');
const etc_child_test = cp.fork('./child_test/etc_child_test.js');
const lur_child_test = cp.fork('./child_test/lur_child_test.js');
const mp_child_test = cp.fork('./child_test/mp_child_test.js');
const policy_child_test = cp.fork('./child_test/policy_child_test.js');
const simAdder_child_test = cp.fork('./child_test/simAdder_child_test.js');
const sms_child_test = cp.fork('./child_test/sms_child_test.js');
const DB_test = cp.fork('./child_test/db_child_test.js');


parsing_child_test.on('exit', code => {
  console.log("exit")
  console.log(`Exit code is: ${code}`);
})
parsing_child_test.on('error', (value) => {
  console.log("error")
  console.log(value)
})


call_child_test.on('exit', code => {
  console.log("exit")
  console.log(`Exit code is: ${code}`);
})
call_child_test.on('error', (value) => {
  console.log("error")
  console.log(value)
})
cnd_child_test.on('exit', (value) => {
  console.log("exit")
  console.log(`Exit code is: ${code}`);
})
etc_child_test.on('error', (value) => {
  console.log("error")
  console.log(value)
})
lur_child_test.on('exit', code  => {
  console.log("exit")
  console.log(`Exit code is: ${code}`);
})
lur_child_test.on('error', (value) => {
  console.log("error")
  console.log(value)
})
mp_child_test.on('exit', code  => {
  console.log("exit")
  console.log(`Exit code is: ${code}`);
})
mp_child_test.on('error', (value) => {
  console.log("error")
  console.log(value)
})
policy_child_test.on('exit', code  => {
  console.log("exit")
  console.log(`Exit code is: ${code}`);
})
policy_child_test.on('error', (value) => {
  console.log("error")
  console.log(value)
})
DB_test.on('exit', code  => {
  console.log("exit")
  console.log(`Exit code is: ${code}`);
})
DB_test.on('error', (value) => {
  console.log("error")
  console.log(value)
})
sms_child_test.on('exit', code  => {
  console.log("exit")
  console.log(`Exit code is: ${code}`);
})
sms_child_test.on('error', (value) => {
  console.log("error")
  console.log(value)
})




parsing_child_test.on('message', (value) => {
  job_que = value;
  console.log("recive job_que");
  while (job_que.length > 0) {
    jobQueue.add({
      msg: job_que.shift()
    });
  }
});

policy_child_test.on('message', (value) => {
  //만약 DB CHILD에 넘겨줄 데이터일경우 처리


  console.log("send to policy");
  resultQueue.add({
    msg: value
  });

});
call_child_test.on('message', (value) => {
  //만약 DB CHILD에 넘겨줄 데이터일경우 처리

  console.log("send to call");
  resultQueue.add({
    msg: value
  });

});
lur_child_test.on('message', (value) => {
  //만약 DB CHILD에 넘겨줄 데이터일경우 처리

  console.log("send to lur");
  resultQueue.add({
    msg: value
  });

});

sms_child_test.on('message', (value) => {
  //만약 DB CHILD에 넘겨줄 데이터일경우 처리

  console.log("send to sms");
  resultQueue.add({
    msg: value
  });
});
mp_child_test.on('message', (value) => {
  //만약 DB CHILD에 넘겨줄 데이터일경우 처리

  console.log("send to sms");
  resultQueue.add({
    msg: value
  });

});
