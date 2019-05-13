var Realm = require('realm');
// const chema = require('../realm_test.js')
const chema = require('../global.js')
const global_value = require('../global_value.js')
var Queue = require('bull');
var lur_que = new Queue('lur_que');
var check_que = new Queue('check_que');


// lur_que.on('empty', function(job, result) {
//   console.log("lur_que is empty");
// });
// check_que.on('empty', function(job, result) {
//   console.log("check_que is empty");
// });
// lur_que.clean(1000);
// check_que.clean(1000);
// lur_que.on('cleaned', function(job, status) {
//   console.log("lur_que is cleaned");
// });
// check_que.on('cleaned', function(job, status) {
//   console.log("check_que is cleaned");
// });
let realm = new Realm({
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST],
  schemaVersion: 20
});
console.log("[LUR] ON");
lur_que.process(function(job, done) {
  var user_sim_check = 'imsi = "' + job.data.imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  // console.log("jobQueue : ", job.data.msg);
  //MP|LUR|imsi|imei|tmsi|kc|cksn|msisdn|lac|simbank_id|sim_serial_no|
  console.log("lur_que id : " + job.id + " imsi  : " + job.data.imsi)

  realm.write(() => {
    user_sim_checker[0].lur_fail_cnt = user_sim_checker[0].lur_fail_cnt + 1
    user_sim_checker[0].lur_check = 0
  });
  check_que.add({
    imsi: job.data.imsi
  }, {
    delay: global_value.lur_check_time,
    // jobId: job.data.imsi
  });
  var msg = "MP|LUR|" + user_sim_checker[0].imsi + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].kc + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisdn + "|" + user_sim_checker[0].lac + "|" + user_sim_checker[0].sim_id + "|" + user_sim_checker[0].sim_serial_no + "|"
  console.log(msg);
  process.send(msg);
  done();
});

check_que.process(function(job, done) {
  console.log("check_que : " + job.data.imsi)
  var imsi = job.data.imsi;
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  var now = Date.now();
  // if (user_sim_checker[0].lur_date + 3660000 < now) { //lur이 시도 실패
  console.log("lur_que id : " + job.id + " imsi  : " + job.data.imsi)

  if (user_sim_checker[0].lur_date + global_value.lur_check_time < now && user_sim_checker[0].lur_check == 0) { //lur이 시도 실패

    console.log("check_que : lur fail")

    lur_que.add({
        imsi: imsi
      }
      // ,{jobId :imsi }
    );

    try {

      realm.write(() => {
        user_sim_checker[0].lur_check = 1
      });
    }
    catch (e) {
      console.log(e)
    }
  }
  else { //lur이 시도 성공
    console.log("check_que : lur sucess")
    realm.write(() => {
      user_sim_checker[0].lur_fail_cnt = user_sim_checker[0].lur_fail_cnt - 1
    });
  }
  done();
});

function command_classifier(data) {
  switch (data['data1']) {
    case 'LUR': //테이블 체크
      //call function
      console.log("LUR ");
      lur_update(data);
      break;
    case 'reTMSI': //회원가입
      //call function
      console.log("reTMSI");
      lur_update(data);
      break;
    case 'QUE': //회원가입
      //call function
      console.log("check_que");
      QUE(data);
      break;
    case 'TRY': //회원가입
      //call function
      console.log("lur_try");
      lur_try(data);
      break;
    case 'LUR_SET': //회원가입
      //call function
      console.log("lur_try");
      set_lur(data);
      break;
    default:
      console.log("[LUR] not find sub command");
  }
}
process.on('message', (value) => {
  console.log("lur is on");
  // command_classifier(value.data);
  command_classifier(value.data)
});

function QUE(dictdata) {

  if (dictdata['data1'] == 'empty') {
    lur_que.empty();
    check_que.empty();
  }
  else if (dictdata['data1'] == 'job_log') {
    var lur_que_job_log = lur_que.getJobs();
    var check_que_job_log = check_que.getJobs();

    console.log(lur_que_job_log);
    console.log(check_que_job_log);

  }
}

function lur_update(dictdata) {
  var now = Date.now();
  if (dictdata['data1'] == 'reTMSI') {
    // reTMSI|conID|imsi|tmsi|lac|arfcn|kc|cksn|mcc|mnc|cellid|bsic|lur_time|

    var command_line = dictdata['command']
    var conID = dictdata['data2']
    var imsi = dictdata['data3']
    var tmsi = dictdata['data4']
    var lac = dictdata['data5']
    var arfcn = parseInt(dictdata['data6'])
    var kc = dictdata['data7']
    var cksn = parseInt(dictdata['data8'])
    var mcc = dictdata['data9']
    var mnc = dictdata['data10']
    var cell_id = dictdata['data11']
    var bsic = dictdata['data12']
    var lur_date = parseInt(dictdata['data13'])

    var user_sim_check = 'imsi = "' + imsi + '"';
    let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);



    if (user_sim_checker.length > 0) {


      realm.write(() => {
        user_sim_checker[0].lur_check = 1,
          user_sim_checker[0].tmsi = tmsi,
          user_sim_checker[0].lac = lac,
          user_sim_checker[0].arfcn = arfcn,
          user_sim_checker[0].kc = kc,
          user_sim_checker[0].cksn = cksn,
          user_sim_checker[0].mcc = mcc,
          user_sim_checker[0].mnc = mnc,
          user_sim_checker[0].cell_id = cell_id,
          user_sim_checker[0].bsic = bsic,
          user_sim_checker[0].lur_date = lur_date
      });


      if (user_sim_checker[0].lur_date + global_value.lur_time < now && user_sim_checker[0].lur_check == 0) { //lur이 시도 실패

        console.log("lur_update : try lur : " + global_value.lur_time)
        lur_que.add({
          imsi: imsi
        }, {
          // delay: global_value.lur_time
          delay: global_value.lur_time,
          // jobId: imsi
        });

        try {

          realm.write(() => {
            user_sim_checker[0].lur_check = 1
          });
        }
        catch (e) {
          console.log(e)
        }


      }
      else {
        console.log("lur_update : lur pass")
      }
    }
    else {
      console.log("[LUR_UPDATE]reTMSI is not found sim")
    }
  }
  else if (dictdata['data1'] == 'LUR') {
    // LUR|conID|imsi|result|lur_time|  result  : 1 성공 / 0 -실패 / -1  채널로스 실패

    var command_line = dictdata['command']
    var conID = dictdata['data2']
    var imsi = dictdata['data3']
    var result = dictdata['data4']
    var lur_time = parseInt(dictdata['data5'])

    var user_sim_check = 'imsi = "' + imsi + '"';
    let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

    const promise = new Promise(function(resolve, reject) {
      resolve(1);
    });
    if (user_sim_checker.length > 0) {

      if (user_sim_checker[0].lur_date + global_value.lur_time < now && user_sim_checker[0].lur_check == 0) { //lur이 시도 실패
        if (result == 1) {
          console.log("lur_update : try lur ")


          promise.then(
            function() {
              lur_que.add({
                imsi: imsi
              }, {
                // delay: global_value.lur_time
                delay: global_value.lur_time,
                // jobId: imsi

              });
            }
          ).then(
            function() {
              console.log("lur_time : " + lur_time)
              realm.write(() => {
                user_sim_checker[0].lur_date = lur_time
              });
            }).then(function() {
            try {
              realm.write(() => {
                user_sim_checker[0].lur_check = 1
              });
            }
            catch (e) {
              console.log(e)
            }
          })



        }
        else {
          console.log("lur_update : result fail " + result)
        }

      }
      else {
        console.log("lur_update : lur pass")
      }
    }
    else {
      console.log("[LUR_UPDATE]LUR is not found sim")
    }
  }

  else {
    console.log("[LUR_UPDATE] is not found command")
  }


}



function lur_checker() {


  var now = Date.now();
  // var user_sim_check = 'user_id.@size >5';
  // let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  //
  let user_sim_checker = realm.objects('SIM');
  var array = [];

  console.log(user_sim_checker.length)

  if (user_sim_checker.length > 0) {



    for (var i = 0; i < user_sim_checker.length; i++) {


      // if (user_sim_checker[i].lur_date == 0 || user_sim_checker[i].lur_date + 3660000 < now) {
      // if (user_sim_checker[i].lur_date == 0) {
      if (true) {

        array.push(user_sim_checker[i].imsi)
      }
      else {
        console.log("not lur sim")
      }
    }
  }
  else {
    console.log("[LUR] not found sim")
  }
  return array;
}

function set_lur() {
  var now = Date.now();

  var check = [];
  check = lur_checker();



  console.log(check.length)
  if (check.length > 0) {


    for (var i = 0; i < check.length; i++) {

      var user_sim_check = 'imsi = "' + check[i] + '"';
      let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
      try {

        realm.write(() => {
          user_sim_checker[0].lur_check = 1
        });
      }
      catch (e) {
        console.log(e)
      }
      console.log("set_lur " + check[i])
      lur_que.add({
        imsi: check[i]
      }, {
        delay: global_value.lur_time,
        // jobId: check[i],
      });

    }
  }
  else {
    console.log("[LUR] not found sim")
  }
}

function lur_try(dictdata) {
  var imsi = dictdata['data2'];

  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  console.log("lur_try")
  if (user_sim_checker.length > 0) {
    lur_que.add({
      imsi: imsi
    });
  }
  else {
    console.log("[LUR_TRY] is not found sim")
  }
}
