var Realm = require('realm');
// const chema = require('../realm_test.js')
const chema = require('../global.js')
const global_value = require('../global_value.js')
var Queue = require('bull');
var lur_que = new Queue('lur_que');
var check_que = new Queue('check_que');
let realm = new Realm({
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST, chema.GLOBALCARRIER_TEST],
  schemaVersion: 24
});

require('date-utils');
var fs = require('fs');
var options = {
  encoding: 'utf8',
  flag: 'a'
};

function write_log(data) {
  var dt = new Date();
  var d = dt.toFormat('YYYY-MM-DD HH24:MI:SS');
  var dd = dt.toFormat('YYYY-MM-DD');
  fs.writeFile('./log/child/lur_child_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}

console.log("[LUR] ON");

lur_que.empty().then(function() {
  console.log("lur_que : emptyyyyyyyyyyyyyyyyyyyy")
  write_log("lur_que : emptyyyyyyyyyyyyyyyyyyyy")

})
check_que.empty().then(function() {
  console.log("check_que : emptyyyyyyyyyyyyyyyyyyyy")
  write_log("check_que : emptyyyyyyyyyyyyyyyyyyyy")
})
lur_que.process(function(job, done) {
  var user_sim_check = 'imsi = "' + job.data.imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  // console.log("jobQueue : ", job.data.msg);
  //MP|LUR|imsi|imei|tmsi|kc|cksn|msisdn|lac|simbank_id|sim_serial_no|
  var now = Date.now();
  if (user_sim_checker.length > 0) {


    var imsi = user_sim_checker[0].imsi;
    var imei = user_sim_checker[0].imei;
    var tmsi = user_sim_checker[0].tmsi;
    var kc = user_sim_checker[0].kc;
    var cksn = user_sim_checker[0].cksn;
    var msisdn = user_sim_checker[0].msisdn;
    var lac = user_sim_checker[0].lac;
    var sim_id = user_sim_checker[0].sim_id;
    var sim_serial_no = user_sim_checker[0].sim_serial_no;
    var lur_date = user_sim_checker[0].lur_date
    var lur_fail_cnt = user_sim_checker[0].lur_fail_cnt
    var lur_check = user_sim_checker[0].lur_check

    console.log("lur_que id : " + job.id + " imsi  : " + job.data.imsi + "")
    if (lur_date + global_value.lur_check_time < now) {
      lur_fail_cnt = lur_fail_cnt +1
      lur_check = 0
      realm.write(() => {
        user_sim_checker[0].lur_fail_cnt = lur_fail_cnt
        user_sim_checker[0].lur_check = lur_check
      });
      check_que.add({
        imsi: imsi
      }, {
        delay: global_value.lur_check_time,
        // jobId: job.data.imsi
      });
      var msg = "MP|LUR|" + imsi + "|" +imei + "|" + tmsi + "|" + kc + "|" + cksn + "|" + msisdn + "|" +lac + "|" + sim_id+ "|" + sim_serial_no + "|"
      console.log(msg);
      process.send(msg);
      write_log("lur_que :  done check_que add  imsi : " + job.data.imsi)

    }
    else {
      console.log("lur_que :  add pass is already lur : " + job.data.imsi);
      write_log("lur_que :  add pass is already lur : " + job.data.imsi)

    }

  }
  else {

  }


  done();
});

check_que.process(function(job, done) {
  var imsi = job.data.imsi;
  // console.log("check_que : " + imsi)
  write_log("check_que : " + imsi)
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  var now = Date.now();
  // if (user_sim_checker[0].lur_date + 3660000 < now) { //lur이 시도 실패
  // console.log("lur_que id : " + job.id + " imsi  : " + imsi)
  write_log("lur_que id : " + job.id + " imsi  : " + imsi)

  if (user_sim_checker.length > 0) {

    var lur_date = user_sim_checker[0].lur_date;
    var lur_check = user_sim_checker[0].lur_check;
    var lur_fail_cnt = user_sim_checker[0].lur_fail_cnts;


    if (lur_date + global_value.lur_check_time < now && lur_check == 0) { //lur이 시도 실패

      console.log("check_que : lur fail")

      lur_que.add({
          imsi: imsi
        }
        // ,{jobId :imsi }
      );

      try {
        lur_check = 1
        realm.write(() => {
          user_sim_checker[0].lur_check = lur_check
        });

        write_log("check_que :  lur_que add  imsi : " + job.data.imsi)

      }
      catch (e) {
        console.log(e)
        write_log("check_que :  lur_que add error  imsi : " + job.data.imsi + " error : " + e)

      }
    }
    else { //lur_que에 시도또는
      console.log("check_que : lur sucess")
      write_log("check_que :  lur sucess imsi : " + job.data.imsi)
      lur_fail_cnt = lur_fail_cnt -1
      realm.write(() => {
        user_sim_checker[0].lur_fail_cnt = lur_fail_cnt - 1
      });
    }
  }
  else {
    console.log("lur check_que : sim is not found")
    write_log("lur check_que : sim is not found")
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
      console.log("set_lur");
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

  if (dictdata['data2'] == 'REMOVE') {
    lur_que.remove();
    check_que.remove();

  }
  else if (dictdata['data2'] == 'LOG') {
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

      var lur_check = user_sim_checker[0].lur_check;


      if (true) { //lur이 시도 실패

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

        lur_que.add({
          imsi: imsi
        }, {
          // delay: global_value.lur_time
          delay: global_value.lur_time,
          // jobId: imsi
        });

        write_log("lur_update : lur_que add reTMSI " + global_value.lur_time + " imsi : " + imsi)
      }

      else {
        console.log("lur_update : lur pass")
        write_log("lur_update :  LUR reTMSI pass lur_check : " + lur_check + " imsi : " + imsi)

      }
    }
    else {
      console.log("[LUR_UPDATE]reTMSI is not found sim")
      write_log("lur_update :  reTMSI  is not found sim ")

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

      if (true) { //lur이 시도 실패
        if (result == 1) {
          console.log("lur_update : lur_que add ")

          lur_que.add({
            imsi: imsi
          }, {
            // delay: global_value.lur_time
            delay: global_value.lur_time,
            //        jobId: imsi
          });
          realm.write(() => {
            user_sim_checker[0].lur_date = lur_time,
              user_sim_checker[0].lur_check = 1

          });

          write_log("lur_update :  lur_que add LUR result success imsi : " + imsi)
        }
        else {
          console.log("lur_update : result fail " + result)
          write_log("lur_update :  LUR result fail : " + imsi)

        }

      }
      else {
        console.log("lur_update : lur pass")
        write_log("lur_update :  LUR lur pass lur_check : " + lur_check + " imsi : " + imsi)

      }
    }
    else {
      console.log("[LUR_UPDATE]LUR is not found sim")
      write_log("lur_update :  LUR is not found sim : " + imsi)

    }
  }

  else {
    console.log("[LUR_UPDATE] is not found command")
    write_log("lur_update :  is not found command")

  }


}



function lur_checker() {
  var now = Date.now();
  // var user_sim_check = 'user_id.@size >5';lur_update
  // let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  //
  let user_sim_checker = realm.objects('SIM');
  var array = [];
  var sim_length = user_sim_checker.length;

  if (user_sim_checker.length > 0) {
    for (var i = 0; i < sim_length; i++) {
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
        // delay: global_value.lur_time,
        // jobId: check[i],
      });
      write_log("set_lur() add " + check[i])

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
  write_log("lur_try")

  if (user_sim_checker.length > 0) {
    lur_que.add({
        imsi: imsi
      },
      //  {
      //   jobId: imsi
      // }
    );
    write_log("lur_try lur_que add")
  }
  else {
    console.log("[LUR_TRY] is not found sim")
  }
}

function sim_lur_try(dictdata) {
  var imsi = dictdata['data2'];
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  console.log("sim_lur_try")
  write_log("sim_lur_try")

  if (user_sim_checker.length > 0) {
    lur_que.add({
        imsi: imsi
      },
      //  {
      //   jobId: imsi
      // }
    );
    write_log("sim_lur_try lur_que add")
  }
  else {
    console.log("[SIM_LUR_TRY] is not found sim")
  }
}

// set_lur()
