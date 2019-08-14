"use strict";

console.log("[ETC] ON")
var Realm = require('realm');
const crypto = require('crypto');
const chema = require('../global.js')
const global_value = require('../global_value.js')
var mysql = require('mysql');
var Queue = require('bull');

var etc_que = new Queue('etc_que');
var addon = require('bindings')('addon');
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");



var hash_test = require('./realm_controller.js');

var sim_map = hash_test.sim_map;
var user_map = hash_test.user_map;
var carrier_map = hash_test.carrier_map;
var rate_map = hash_test.rate_map;

var RealmQue = new Queue('RealmQue')

function bull_add_data(data) {
  RealmQue.add({
    data: data
  })
}

var config = {
  connectTimeout: 10000,
  host: 'everytt-rds.cf5whdjkixxd.ap-southeast-1.rds.amazonaws.com',
  user: 'everytt',
  password: 'dpqmflTT1#',
  database: 'smartTT'
}
var connection = mysql.createConnection(config);
connection.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  write_log("MYSQL Connected!");
});

connection.on('error', function(error) {
  if (!error.fatal) return;
  if (error.code !== 'PROTOCOL_CONNECTION_LOST') throw err;
  write_log('> Re-connecting lost MySQL connection: ' + error.stack);
  connection = mysql.createConnection(config);
  connection.connect();
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
  fs.writeFile('./log/child/etc_child_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}

process.on('message', (value) => {
  console.log("ETC is on");
  ETC_classifier(value.data);
});

function compactRealm() {
  console.log("compactRealm")
  realm.commitTranscation()
  if (realm.compact()) {
    console.log("compact end")
  }
}

//etc_que mp서버에 처리하는 것만 담당하고 있다.
etc_que.process(function(job, done) {


  write_log("etc_que : " + job.data.imsi)
  write_log("etc_que : " + job.data.flag)

  var flag = job.data.flag;
  var imsi = job.data.imsi;
  var flag_point = 99;


  var sim_check = sim_map.get(imsi)

  var now = Date.now();

  // flag = o 일경우 시도했으나 처리가 되지 않았다  falg = 1 일 경우 시도가 되었다.
  console.log("ETC balacne, msisdn, charge etc_que id : " + job.id + " imsi  : " + job.data.imsi)
  if (sim_check != "undefined") {

    var etc_blance_flag = sim_check.etc_blance_flag
    var etc_msisdn_flag = sim_check.etc_msisdn_flag
    var etc_charge_flag = sim_check.etc_charge_flag

    if (flag == "etc_blance_flag") { //심 잔액 체크 일경우

      if (etc_blance_flag > 3) {
        //MYSQL에 표시해 주어야된다.
        console.log("MYSQL에 표시해 주어야된다.");
        etc_blance_flag = 0
        bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|etc_blance_flag|INT|" + etc_blance_flag + "|")
      }
      else {

        if (etc_blance_flag != 0) { // etc_blance_flag 실패시

          try {
            etc_blance_flag = etc_blance_flag + 1
            bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|etc_blance_flag|INT|" + etc_blance_flag + "|")
            write_log("etc_que :  new try etc_msisdn  imsi : " + job.data.imsi)
            sim_balance_check(imsi);
          }
          catch (e) {
            console.log(e)
            write_log("etc_que etc_msisdn_flag error : " + job.data.imsi + " error : " + e)
          }
        }
        else {
          write_log("etc_que etc_msisdn_flag success : " + job.data.imsi)
        }
      }

    }
    else if (flag == "etc_msisdn_flag") { //msisdn 체크

      if (etc_msisdn_flag > 3) {
        //MYSQL에 표시해 주어야된다.
        console.log("MYSQL에 표시해 주어야된다.");
        etc_msisdn_flag = 0
        bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|etc_msisdn_flags|INT|" + etc_msisdn_flag + "|")
      }
      else {

        if (etc_msisdn_flag != 0) { // etc_blance_flag 실패시

          try {
            etc_msisdn_flag = etc_msisdn_flag + 1
            bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|etc_msisdn_flags|INT|" + etc_msisdn_flag + "|")
            write_log("etc_que :  new try etc_msisdn  imsi : " + job.data.imsi)
            sim_msisdn_check(imsi);
          }
          catch (e) {
            console.log(e)
            write_log("etc_que etc_msisdn_flag error : " + job.data.imsi + " error : " + e)
          }
        }
        else {
          write_log("etc_que etc_msisdn_flag success : " + job.data.imsi)
        }
      }

    }
    else if (flag == "etc_charge_flag") {
      if (etc_charge_flag > 3) {
        //MYSQL에 표시해 주어야된다.
        console.log("MYSQL에 표시해 주어야된다.");
        etc_charge_flag = 0
        bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|etc_charge_flag|INT|" + etc_charge_flag + "|")
      }
      else {

        if (etc_charge_flag != 0) { // etc_blance_flag 실패시

          try {
            etc_charge_flag = etc_charge_flag + 1
            bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|etc_charge_flag|INT|" + etc_charge_flag + "|")
            write_log("etc_que : new try etc_charge  imsi : " + job.data.imsi)
            sim_charge(imsi);
          }
          catch (e) {
            console.log(e)
            write_log("etc_que etc_charge_flag error : " + job.data.imsi + " error : " + e)
          }
        }
        else {
          write_log("etc_que etc_charge_flag success : " + job.data.imsi)
        }
      }
    }
  }
  else {
    console.log("ETC etc_que error : is not found sim")
    write_log("ETC etc_que error : is not found sim")
  }
  done();
});



function ETC_classifier(data) {
  switch (data['data1']) {

    case 'E00':
      write_log("유저보기");
      view()
      break;
    case 'E11': //realm mysql 데이터베이스 동기화 user, sim, rate, carrier
      DB_synchronization(data);
      break;
    case 'QUERY': //QUERY MYSQL DB 쿼리 실행함슈
      write_log("QUERY")
      query_processor(data);
      break;
    case 'VIEW': //realm user, sim, rate, carrier 데이터 확인
      write_log("table_view");
      table_view(data);
      break;
    case 'DEATH': //realm user, sim, rate, carrier 데이터 컬럼 전채 삭제
      write_log("death");
      death(data);
      break;
    case 'PDEATH': //realm user, sim, rate, carrier 특정한 ID 값을 가진 객체만 삭제
      write_log("PDEATH");
      point_death(data);
      break;
    case 'CREDIT': //realm 특정 유저 크래딧 추가
      credit_update(data);
      break;
    case 'BALANCE': //심 잔액체크
      sim_balance_check(data);
      break;
    case 'MSISDN': //심 전화번호 체크
      sim_msisdn_check(data);
      break;
    case 'COMPACT':
      compactRealm()
      break;
      // case 'MYSQL': //realm mysql 데이터베이스 동기화
      //   send_mysql(data);
      //   break;
    case 'ZERO': //심 IMSI 값을 통해 TMSI를 0으로 바꿔주는 함수
      tmsi_zero(data);
      break;
    default:
      console.log(data);
  }
}


//사용자 크래딧 업데이트 하는 함수이다.
function credit_update(dictdata) {
  var command_line = dictdata;
  var command = command_line['command'];
  var num = command_line['data2'];
  var user_id = command_line['data3'];
  var user_check = user_map.get(user_id)
  try {
    bull_add_data("REALM|MODIFY|USER|" + user_check.user_id + "|imsi = '" + user_check.user_id + "'|credit|INT|" + parseInt(num) + "|")
    var sql = "UPDATE tb_user_test set credit = " + num + " WHERE id  = " + user_id;
    var dbmsg = "QUERY|UPDATE tb_user_test set credit = " + num + " WHERE pid  = " + user_id;
  }
  catch (e) {
    console.log("credit_update error")
  }
}

//심 잔액 체크
function sim_balance_check(dictdata) {
  var imsi = dictdata['data2'];
  var port = dictdata['port'];
  var sim_check = sim_map.get(imsi);
  // MP|BALANCE|imsi|imei|tmsi|kc|cksn|msisdn|lac|simbank_id|sim_serial_no|
  // ussd 커맨드, smsc 맨뒤에 추가


  if (sim_check != "undefined") { //imsi 정보가 일치할 경우

    var carrier_id = sim_check.mcc + sim_check.mnc
    var carrier_check = carrier_map.get(carrier_id)

    var etc_blance_flag = sim_check.etc_blance_flag
    if (carrier_check != "undefined") {
      var mp_ip = carrier_check.mp_ip;
      var mp_port = carrier_check.mp_port;

      var msg = "MP|BALANCE|" + sim_check.imsi + "|" + sim_check.imei + "|" + sim_check.tmsi + "|" + sim_check.kc + "|" + sim_check.cksn + "|" + sim_check.msisdn + "|" + sim_check.lac + "|" + sim_check.sim_id + "|" + sim_check.sim_serial_no + "|" + user_carrier_checker[0].balance_ussd + "|" + user_carrier_checker[0].smsc + "|$" + port;
      // var msg = "MP|BALANCE|" + user_sim_checker[0].imsi + "|";

      process.send({
        data: msg,
        port: mp_port,
        ip: mp_ip
      });

      write_log("[ETC] sim_balance_check : " + msg);

      etc_que.add({
        imsi: imsi,
        flag: sim_check.etc_blance_flag,
      }, {
        delay: carrier_check.etc_check_time,
      });
    }
    else {
      console.log("[ETC] sim_balance_check GLOBALCARRIER : is not sim imsi");
      write_log("[ETC] sim_balance_check GLOBALCARRIER : is not sim imsi");
    }
  }
  else {
    console.log("[ETC] sim_balance_check : is not sim imsi");
    write_log("[ETC] sim_balance_check : is not sim imsi");
  }
}

//msisdn 채크
function sim_msisdn_check(dictdata) {
  //MP|MSISDN|imsi|imei|tmsi|kc|cksn|lac|simbank_id|sim_serial_no|
  // ussd 커맨드, smsc 맨뒤에 추가
  var imsi = dictdata['data2'];
  var port = dictdata['port'];


  var user_sim_check = 'imsi = "' + parseInt(imsi) + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  var sim_check = sim_map.get(imsi)

  if (sim_check != "undefined") { //imsi 정보가 일치할 경우
    var mcc = sim_check.mcc
    var mnc = sim_check.mnc
    var imei = sim_check.imei
    var tmsi = sim_check.tmsi
    var kc = sim_check.kc
    var cksn = sim_check.cksn
    var lac = sim_check.lac
    var sim_id = sim_check.sim_id
    var sim_serial_no = sim_check.sim_serial_no
    var etc_msisdn_flag = sim_check.etc_msisdn_flag
    var msisdn_ussd = user_carrier_checker[0].msisdn_ussd
    var smsc = user_carrier_checker[0].smsc

    var carrier_id = mcc + mnc;
    var carrier_check = carrier_map.get(carrier_id);

    if (carrier_id != "undefined") {
      var mp_ip = carrier_check.mp_ip;
      var mp_port = carrier_check.mp_port;

      var msg = "MP|MSISDN|" + imsi + "|" + imei + "|" + tmsi + "|" + kc + "|" + cksn + "|" + lac + "|" + sim_id + "|" + sim_serial_no + "|" + msisdn_ussd + "|" + smsc + "|";

      process.send({
        data: msg,
        port: mp_port,
        ip: mp_ip

      });
      write_log("[ETC] sim_msisdn_check : " + msg);
      etc_que.add({
        imsi: imsi,
        flag: etc_msisdn_flag,
      }, {
        delay: carrier_check.etc_check_time,
      });
    }
    else {
      console.log("[ETC] sim_msisdn_check GLOBALCARRIER: is not sim imsi");
      write_log("[ETC] sim_msisdn_check : is not sim imsi");
    }
  }
  else {
    console.log("[ETC] sim_msisdn_check GLOBALCARRIER: is not sim imsi");
    write_log("[ETC] sim_msisdn_check : is not sim imsi");
  }
}

//realm 데이터베이스 내용 json 파일로 보여주는 함수
function table_view(dictdata) {
  // console.log("USER RESULT",realm.objects('USER'));
  var command_line = dictdata;
  var chosechema = command_line['data2'];
  var content = command_line['data3'];
  write_log("table_view")
  if (chosechema == 'USER') {
    var keys = user_map.keys();
    var temp = "";
    keys.forEach(function(key) {
      console.log("user")
      temp += user_map.get(key)
    })
    fs.writeFile('realm_user.json', temp, 'utf8', function(err) {
      if (err) throw err;
      console.log('complete');
    });
  }
  else if (chosechema == 'SIM') {
    var now = Date.now();
    var keys = sim_map.keys();
    var temp = "";
    keys.forEach(function(key) {
      console.log("sim")
      temp += sim_map.get(key)
    })

    fs.writeFile('realm_sim.json', temp, 'utf8', function(err) {
      if (err) throw err;
      console.log('complete');
    });

  }
  else if (chosechema == 'RATE') {

    var keys = sim_map.keys();
    var temp = "";
    keys.forEach(function(key) {
      console.log("sim")
      temp += sim_map.get(key)
    })
  }
  else if (chosechema == 'CARRIER') {
    var keys = carrier_map.keys();
    var temp = "";
    keys.forEach(function(key) {
      console.log("carrier")
      temp += carrier_map.get(key)
    })
    // var carrier_json = JSON.stringify(carrier_checker);
    fs.writeFile('realm_carrier.json', temp, 'utf8', function(err) {
      if (err) throw err;
      console.log('complete');
    });
  }
  else {
    console.log("table_view command not found");
  }
}


//특정 데이터의 id 값을 통해 데이터를 지우는 함수
function point_death(dictdata) {
  var chosechema = dictdata['data2'];
  var id = dictdata['data3'];

  try {
    write_log("point death : " + dictdata)

    if (chosechema == 'SIM') {
      bull_add_data("REALM|DELETE|SIM|" + id + "|")

    }
    else if (chosechema == 'USER') {

      bull_add_data("REALM|DELETE|USER|" + id + "|")
    }
    else if (chosechema == 'CARRIER') {
      bull_add_data("REALM|DELETE|CARRIER|" + id + "|")
    }
  }
  catch (err) {
    console.log(err)
    write_log("point death err: " + err)
  }
}

//특정 스키마 전체를 지우는 함수
function death(dictdata) {
  var chosechema = dictdata['data2'];
  try {
    write_log("policy_child death : " + dictdata)

    if (chosechema == 'SIM') {

      realm.write(() => {
        var allsim = realm.objects('SIM');
        realm.delete(allsim);
        console.log("전체 SIM 삭제 완료")
        write_log("전체 SIM 삭제 완료")

      })
    }
    else if (chosechema == 'USER') {
      realm.write(() => {
        var alluser = realm.objects('USER');
        realm.delete(alluser);
        console.log("전체 USER 삭제 완료")
        write_log("전체 USER 삭제 완료")

      })
    }
    else if (chosechema == 'RATE') {
      realm.write(() => {
        var allrate = realm.objects('RATE');
        realm.delete(allrate);
        console.log("전체 RATE 삭제 완료")
        write_log("전체 RATE 삭제 완료")

      })
    }
    else if (chosechema == 'CARRIER') {
      realm.write(() => {
        var allcarrier = realm.objects('GLOBALCARRIER');
        realm.delete(allcarrier);
        console.log("전체 CARRIER 삭제 완료")
        write_log("전체 CARRIER 삭제 완료")

      })
    }
    else if (chosechema == 'ALL') { //user, sim 전체 데이터 삭제
      realm.write(() => {
        realm.deleteAll();
        var alluser = realm.objects('USER');
        var allsim = realm.objects('SIM');
        realm.delete(alluser);
        realm.delete(allsim);
        console.log("전체 컬럼 삭제 완료")
        write_log("전체 컬럼 삭제 완료")

      })
    }
  }
  catch (err) {
    console.log(err)
    write_log(" death err: " + err)
  }
}
