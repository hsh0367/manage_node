var Realm = require('realm');
// const chema = require('../realm_test.js')
const chema = require('../global.js')
const global_value = require('../global_value.js')
var Queue = require('bull');

var lur_que = new Queue('lur_que');
var check_que = new Queue('check_que');


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
write_log("[LUR] ON")

console.log("lur_que : ON")
write_log("lur_que : ON")
console.log("check_que : ON")
write_log("check_que : ON")



lur_que.process(function(job, done) {
  var now = Date.now();
  var imsi = job.data.imsi
  // console.log("jobQueue : ", job.data.msg);
  //MP|LUR|imsi|imei|tmsi|kc|cksn|msisdn|lac|simbank_id|sim_serial_no|
  write_log("lur_que ON imsi : " + imsi)
  var sim_check = sim_map.get(imsi)
  if (sim_check != "undefined") {


    var imsi = sim_check.imsi;
    var imei = sim_check.imei;
    var tmsi = sim_check.tmsi;
    var kc = sim_check.kc;
    var cksn = sim_check.cksn;
    var msisdn = sim_check.msisdn;
    var lac = sim_check.lac;
    var sim_id = sim_check.sim_id;
    var sim_serial_no = sim_check.sim_serial_no;
    var lur_date = sim_check.lur_date
    var lur_fail_cnt = sim_check.lur_fail_cnt
    var lur_check = sim_check.lur_check

    var mcc = sim_check.mcc;
    var mnc = sim_check.mnc;

    var carrier_id = mcc + mnc
    var carrier_check = carrier_map.get(carrier_id)

    if (lur_fail_cnt < 8 && carrier_check != "undefined") {
      var lur_check_time = carrier_check.lur_check_time
      var LUR_time = carrier_check.LUR_time
      var ip = carrier_check.mp_ip
      var port = carrier_check.mp_port
      // if (lur_date + LUR_time < now) {
      lur_fail_cnt = lur_fail_cnt + 1
      lur_check = 0

      write_log("lur_que lur_check_time : " + lur_check_time + " imsi  : " + imsi + "")
      write_log("ip  : " + ip + " port  : " + port + "")

      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_fail_cnt|INT|" + lur_fail_cnt + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_check|INT|" + lur_check + "|")

      // 테스트하기 위해 check_que에 실행시키지 않았음
      check_que.add({
        imsi: imsi
      }, {
        delay: lur_check_time
      });
      var msg = "MP|LUR|" + imsi + "|" + imei + "|" + tmsi + "|" + kc + "|" + cksn + "|" + msisdn + "|" + lac + "|" + sim_id + "|" + sim_serial_no + "|"
      console.log(msg);
      write_log(msg);

      process.send({
        data: msg,
        port: port,
        ip: ip,
      });
      write_log("lur_que :  done check_que add  imsi : " + job.data.imsi)
    }
  }
  done();
});

check_que.process(function(job, done) {
  var now = Date.now();
  var imsi = job.data.imsi;
  // console.log("check_que : " + imsi)
  write_log("check_que : " + imsi)
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  var sim_check = sim_map.get(imsi)


  write_log("lur_que id : " + job.id + " imsi  : " + imsi)

  var carrier_id = imsi.slice(0, 5)
  var carrier_check = carrier_map(carrier_id)

  if (sim_check != "undefined" && carrier_check != "undefined") {
    if (sim_check.sim_type == 0) {

      var lur_date = sim_check.lur_date;
      var lur_check = sim_check.lur_check;
      var lur_fail_cnt = sim_check.lur_fail_cnt;

      var LUR_time = carrier_check.LUR_time
      var total = lur_date + LUR_time
      write_log("check_que imsi : " + imsi + "lur_date + LUR_time : " + total)
      write_log("check_que imsi : " + imsi + "LUR_time : " + LUR_time)
      write_log("check_que imsi : " + imsi + " lur_check : " + lur_check)

      if (total < now && lur_check == 0) {
        //lur이 시도 실패
        console.log("now : " + now + "lur_date : " + lur_date + " lur_check : " + lur_check)
        console.log("check_que : lur fail")


        try {
          lur_check = 1

          bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_check|INT|" + lur_check + "|")
          lur_que.add({
              imsi: imsi
            }
            // ,{jobId :imsi }
          );
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
        lur_fail_cnt = 0
        bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_fail_cnt|INT|" + lur_fail_cnt + "|")
      }


    }
    else if (sim_check.sim_type == 1) { //ttgo
      var lur_date = sim_check.lur_date;
      var lur_check = sim_check.lur_check;
      var lur_fail_cnt = sim_check.lur_fail_cnt;
      var LUR_time = carrier_check.LUR_time
      var total = lur_date + LUR_time
      write_log("ttgo check_que imsi : " + imsi + "lur_date + LUR_time : " + total)
      write_log("ttgo check_que imsi : " + imsi + "LUR_time : " + LUR_time)
      write_log("ttgo check_que imsi : " + imsi + " lur_check : " + lur_check)

      if (total < now && lur_check == 0) {
        //lur이 시도 실패
        console.log("ttgo now : " + now + "lur_date : " + lur_date + " lur_check : " + lur_check)
        console.log("cttgoheck_que : lur fail")
        try {
          lur_check = 1
          bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_check|INT|" + lur_check + "|")

          lur_que.add({
              imsi: imsi
            }
            // ,{jobId :imsi }
          );

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
        lur_fail_cnt = 0
        bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_fail_cnt|INT|" + lur_fail_cnt + "|")
      }
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
    case 'LUR': //lur 결과값이 LUR일경우
      console.log("LUR ");
      lur_update(data);
      break;
    case 'reTMSI': //lur 결과값이 reTMSI일경우
      console.log("reTMSI");
      lur_update(data);
      break;
    case 'TRY': //특정심 LUR 시도
      console.log("lur_try");
      lur_try(data);
      break;
    case 'LUR_SET': //관리하는 심 전체 LUR 시도
      console.log("set_lur");
      set_lur(data);
      break;
    case 'SET_LURDATE': //특정심 LUR DATE Setting
      console.log("set_lur");
      reset_lurdate(data);
      break;
    case 'RCQ': //remove check_que jobs
      //call function
      console.log("remove_check_que_jobs");
      remove_check_que_jobs(data);
      break;

    case 'RCL': //remove lur_que job
      console.log("remove_lur_que_jobs");
      remove_lur_que_jobs(data);
      break;
    default:
      console.log("[LUR] not find sub command");
  }
}
process.on('message', (value) => {
  console.log("lur is on");
  var temp = JSON.stringify(value.data)
  write_log("lur recive msg : " + temp)
  command_classifier(value.data)
});

function tt_lur_update(user_sim_checker, dictdata) {
  var command_line = dictdata['command']
  var now = Date.now();

  write_log("simchecker " + user_sim_checker.toString())
  write_log("dictdata " + dictdata.toString())

  if (dictdata['data1'] == 'reTMSI') {
    // reTMSI|conID|imsi|tmsi|lac|arfcn|kc|cksn|mcc|mnc|cellid|bsic|lur_time|
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
    write_log(tmsi + "|" + lac + "|" + arfcn + "|" + kc + "|" + cksn + "|" + mcc + "|" + mnc + "|" + cell_id + "|" + bsic + "|" + lur_date + "|")


    var lur_check = sim_check.lur_check;
    var mcc = sim_check.mcc;
    var mnc = sim_check.mnc;
    // var global_carrier_check = 'mcc = "' + mcc + '"AND mnc = "' + mnc + '"';
    // let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
    // var LUR_time = carrier_check.LUR_time
    write_log(tmsi + "|" + lac + "|" + arfcn + "|" + kc + "|" + cksn + "|" + mcc + "|" + mnc + "|" + cell_id + "|" + bsic + "|" + lur_date + "|")


    if (true) { //lur이 시도 성공
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_check|INT|" + 1 + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|tmsi|STRING|" + tmsi + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lac|STRING|" + lac + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|arfcn|INT|" + arfcn + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|kc|STRING|" + kc + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|cksn|INT|" + cksn + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|mcc|STRING|" + mcc + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|mnc|STRING|" + mnc + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|cell_id|STRING|" + cell_id + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|bsic|STRING|" + bsic + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_date|INT|" + lur_date + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_fail_cnt|INT|" + lur_fail_cnt + "|")
      write_log("tt_lur_update : lur_que add reTMSI " + LUR_time + " imsi : " + imsi)
    }

    else {
      console.log("tt_lur_update : lur pass")
      write_log("tt_lur_update :  LUR reTMSI pass lur_check : " + lur_check + " imsi : " + imsi)
    }
  }
  else if (dictdata['data1'] == 'LUR') {
    // LUR|conID|imsi|result|lur_time|  result  : 1 성공 / 0 -실패 / -1  채널로스 실패
    var command_line = dictdata['command']
    var conID = dictdata['data2']
    var imsi = dictdata['data3']
    var result = dictdata['data4']
    var lur_time = parseInt(dictdata['data5']) * 1000
    var lur_check = sim_check.lur_check


    var carrier_id = imsi.slice(0, 5)
    var carrier_check = carrier_map.get(carrier_id)
    if (carrier_check != "undefined") {

      if (true) { //lur이 시도 실패
        var LUR_time = carrier_check.LUR_time
        if (result == 1) {
          if (sim_check.lur_date + LUR_time < now || lur_check == 0) {
            bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_date|INT|" +  lur_time - 7200000 + "|")
            bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_check|INT|" + 1 + "|")
            bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_fail_cnt|INT|" + 0 + "|")
            write_log("tt_lur_update :  lur_que add LUR result success imsi : " + imsi)
          }
          else {
            write_log("tt_lur_update :  lur_que add LUR result pass imsi : " + imsi)
          }
        }
        else if (result == 0) {
          console.log("tt_lur_update : lur_que add result 0  ")
          bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|tmsi|STRING|" +"0" + "|")
          write_log("tt_lur_update :  lur tmsi to zero " + sim_check.imsi)
        }
        else {
          console.log("tt_lur_update : result fail " + result)
          write_log("tt_lur_update :  LUR result fail : " + result)
        }
      }
      else {
        console.log("tt_lur_update : lur pass")
        write_log("tt_lur_update :  LUR lur pass lur_check : " + lur_check + " imsi : " + imsi)
      }

    }
    else {
      write_log("ttgo lur update ERROR : is not found country")
    }
  }
}

function lur_update(dictdata) {
  var now = Date.now();
  var imsi = dictdata['data3']

  var sim_check = sim_map.get(imsi)
  if (sim_check != "undefined") {

   if (sim_check.sim_type == 1) {
      tt_lur_update(user_sim_checker, dictdata)
    }
    else {
      write_log("evertt lur_update")
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
  var sim_c

  if (user_sim_checker.length > 0) {
    var keys = sim_map.keys();
    keys.forEach(function(key) {
      array.push(sim_map.get(key).imsi)
    })
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
  console.log("set_lur check.length : " + check.length)
  if (check.length > 0) {

    for (var i = 0; i < check.length; i++) {

      var user_sim_check = 'imsi = "' + check[i] + '"';
      let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
      var sim_check = sim_map.get(check[i])
      try {
        bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_fail_cnt|INT|" + 0 + "|")
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

  var sim_check = sim_map.get(imsi)

  console.log("lur_try")
  write_log("lur_try")

  if (sim_check != "undefined") {
    lur_que.add({
        imsi: imsi
      },
      //  {
      //   jobId: imsi
      // }
    );

    bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_fail_cnt|INT|" + 0 + "|")
    write_log("lur_try lur_que add")
  }
  else {
    console.log("[LUR_TRY] is not found sim")
  }
}

function sim_lur_try(dictdata) {
  var imsi = dictdata['data2'];
  var sim_check = sim_map.get(imsi)

  console.log("sim_lur_try")
  write_log("sim_lur_try")

  if (sim_check != "undefined") {
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

function reset_lurdate(dictdata) {
  var imsi = dictdata['data2'];

  console.log("reset_lurdate")
  write_log("reset_lurdate")
  var sim_check = sim_map.get(imsi)

  if (sim_check != "undefined") {
    bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|lur_date|INT|" + 0 + "|")
    write_log("reset_lurdate : " + imsi)
  }
  else {
    console.log("[reset_lurdate] is not found sim")
  }
}

function remove_check_que_jobs() {
  var get_jobs = check_que.getDelayed()
  get_jobs.then(function(check_jobs) {
    console.log(check_jobs);
    var length = check_jobs.length
    for (var i = 0; i < length; i++) {
      check_jobs[i].remove();
    }
    write_log("remove check_que delayed jobs ")
  })
}

function remove_lur_que_jobs() {
  var get_jobs = lur_que.getDelayed()
  get_jobs.then(function(lur_ques) {
    console.log(lur_ques);
    var length = lur_ques.length
    for (var i = 0; i < length; i++) {
      lur_ques[i].remove();
    }
    write_log("remove lur_que delayed jobs ")
  })
}

function remove_jobs(dictdata) {
  var que = dictdata['data1']

  if (que = 'LUR') {
    remove_lur_que_jobs()

  }
  else if (que = 'CHECK') {
    remove_check_que_jobs()
  }
}
remove_check_que_jobs()
remove_lur_que_jobs()
// set_lur()
