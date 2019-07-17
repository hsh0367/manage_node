"use strict";
console.log("[POLICY] ON")
var Realm = require('realm');
const crypto = require('crypto');
const chema = require('../global.js')
const global_value = require('../global_value.js')
const IMEI_GenCheck = require("imei_gencheck");
const imeigc = new IMEI_GenCheck();
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");
// var realm = new Realm(Realm.defaultPath)

let realm = new Realm({
  path: '/home/ubuntu/manage_node/object_data_copy_file.realm',
  deleteRealmIfMigrationNeeded: true,
  disableFormatUpgrade: true,
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST, chema.GLOBALCARRIER_TEST],
});
require('date-utils');
var fs = require('fs');
var options = {
  encoding: 'utf8',
  flag: 'a'
};

function write_log(data) {
  var dt = new Date();
  var dd = dt.toFormat('YYYY-MM-DD');

  var d = dt.toFormat('YYYY-MM-DD HH24:MI:SS');
  fs.writeFile('./log/child/policy_child_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}
process.on('message', (value) => {
  console.log("policy is on");
  var temp = JSON.stringify(value.data);

  write_log("policy recive data"+temp);

  command_classifier(value.data);
});

function command_classifier(data) {
  switch (data['data1']) {

    case 'TS00': //회원가입
      //call function
      console.log("회원가입");
      write_log("회원가입");
      register(data);
      break;
    case 'TS01': //로그인
      //call function
      console.log("로그인");
      login(data);
      break;
    case 'TS03': //push-key 갱신
      //call function
      console.log("fcm-key 갱신");
      fcm_key_renewal(data);
      break;
    case 'TS06': //voip-key 갱신
      //call function
      console.log("voip-key 갱신");
      voip_key_renewal(data);
      break;
    case 'CS1': //voip-key 갱신
      //call function
      console.log("사용자 정보");
      user_info(data);
      break;
    case 'CS2': //buy sim
      //call function
      console.log("심구매");
      buy_sim(data);
      break;
    case 'CS6': //voip-key 갱신
      //call function
      console.log("auto_flag_renewal 갱신");
      auto_flag_renewal(data);
      break;
    case 'CS7': //voip-key 갱신
      //call function
      console.log("top_up");
      top_up(data);
      break;
    default:
      console.log("not find sub command");
  }
}

//비밀번호 암호화 함수
function psw_encryption(password) {
  return "*" + crypto.createHash('sha1').update(crypto.createHash('sha1').update(password).digest('binary')).digest('hex').toUpperCase();
}

function user_info(dicdata) {
  var command = dicdata['command'];
  var sub_command = dicdata['data1'];
  var seq = dicdata['data2'];
  var user_serial = dicdata['data3'];
  var user_id = dicdata['data4'];
  var port = dicdata['port'];
  //Policy|CS1|Seq|msisdn|imsi|credit|expire_match_date|net:other:date|net:other:date|
  //net:other:date|net:other:date|net:other:date|free_receive|use_event|promo_code||
  write_log("user_info : " + dicdata)

  var user_sim_check = 'user_id =  "' + user_id + '" AND user_serial = "' + user_serial + '"';
  var user_checker = realm.objects('USER').filtered(user_sim_check);
  var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);



  if (user_checker.length > 0) {
    var imsi = user_checker[0].user_sim_imsi
    var credit = user_checker[0].credit

    if (user_sim_checker.length > 0) {
      var msisdn = user_sim_checker[0].msisdn
      var expire_match_date = user_sim_checker[0].expire_match_date
      var out_call_time = user_sim_checker[0].out_call_time


      var msg = command + "|" + sub_command + "|" + seq + "|" + msisdn + "|" + imsi + "|" + credit + "|" + timeConverter(expire_match_date) + "|" +
        "0:0:0|0:0:0|0:0:0|0:0:0|0:0:0|" + out_call_time + "|0|0|";
      process.send({
        data: msg,
        port: port
      });
      console.log(msg);
      write_log("user_info : " + msg)

    }
    else {
      var msg = command + "|" + sub_command + "|" + seq + "|0|0|" + credit + "|0|0:0:0|0:0:0|0:0:0|0:0:0|0:0:0|0|0|0|";
      process.send({
        data: msg,
        port: port
      });
      console.log(msg);
      write_log("user_info : " + msg)

    }
  }
  else {
    var msg = command + "|" + sub_command + "|" + seq + "|FAIL|";
    process.send({
      data: msg,
      port: port
    });
    console.log("등록되지 않는 사용자입니다.");
    write_log("user_info : " + msg)
  }
}

function pad(n, width) {
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

//회원가입
function register(dictdata) {
  write_log("policy_child register on " )

  var command_line = dictdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var tcp_fd = command_line['data3'];
  var user_id = command_line['data4'];
  var user_pw = command_line['data5'];
  var join_type = parseInt(command_line['data6']);
  var realm_id = 'user_id = "' + user_id + '"';
  var realm_id_checker = realm.objects('USER').filtered(realm_id);
  var port = dictdata['port']
  var encpwd = psw_encryption(user_pw);
  if (user_pw == "FACEBOOK" || user_pw.length != 0) { //회원가입이 페이스북으로 진행할경우 비밀번호에 FASCEBOOK 입력


    var user_length = realm.objects('USER').sorted('user_pid',true)
    var user_checker = realm_id_checker.length;
    var user_pid = user_length[0].user_pid + 1;
    var user_serial = "PH01" + pad(user_pid, 15);

    if (user_checker == 0) { // is not find user_id
      realm.write(() => {
        var user = realm.create('USER', {
          user_id: user_id,
          user_pid: user_pid,
          user_pw: encpwd,
          user_serial: user_serial,
          join_type: join_type,
        });
      });
      var msg = command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|SUCCESS|" + "" + user_pid + "|";
      var dbmsg = "DB|D01|" + user_pid + "|" + user_serial + "|" + user_id + "|" + encpwd + "|" + join_type + "|";

      console.log(msg);
      write_log("policy_child register : " + msg)
      process.send({
        data: msg,
        port: port
      });
      addon_child.send_data(dbmsg);
    }
    else {
      console.log("이미 존재하는 ID입니다.");
      // return command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|FAIL|";
      var msg = command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|FAIL|";
      process.send({
        data: msg,
        port: port
      });
      console.log(msg);
      write_log("이미 존재하는 ID입니다.")
      write_log("policy_child register : " + msg)
    }
  }
}

//로그인 처리 msg 를 만들고 전달하는 함수
function login_msg(login_data, sim_data) {

  var msg = login_data.command + "|" + login_data.sub_command + "|" + login_data.seq + "|" + login_data.tcp_fd + "|SUCCESS|" + sim_data.user_serial + "|" + sim_data.credit + "|1[" + sim_data.imsi + ":" + sim_data.msisdn + ":" + timeConverter(sim_data.expire_match_date) + "]|";
  process.send({
    data: msg,
    port: login_data.port
  });
  console.log("policy_child login msg : " + msg)
  write_log("policy_child login msg : " + msg)
}

//ttgo 로그인 처리하는 함수
function tt_login(login_data) {
  var sim_data = new Object();



  sim_data.join_type = 0
  sim_data.user_serial = 0
  sim_data.credit = 0
  sim_data.imsi = 0
  sim_data.msisdn = 0
  sim_data.expire_match_date = 0

  write_log(" login_data.user_id : " + login_data.user_id)
  write_log(" login_data.encpwd : " + login_data.encpwd)

  var user_check = 'user_id = "' + login_data.user_id + '" AND user_pw = "' + login_data.encpwd + '"';
  var user_checker = realm.objects('USER').filtered(user_check);
  var now = Date.now();


  write_log("user_checker.length : " + user_checker.length)
  if (user_checker.length > 0) { //if user is found
    var user_sim_check = 'imsi = "' + login_data.imsi + '" AND user_id =  "' + login_data.user_id + '"';
    var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
    sim_data.user_serial = user_checker[0].user_serial;
    sim_data.credit = user_checker[0].credit;
    sim_data.join_type = user_checker[0].join_type;

    if (user_sim_checker.length > 0) { //심구매 유저일경우
      sim_data.imsi = user_sim_checker[0].imsi
      sim_data.msisdn = user_sim_checker[0].msisdn

      console.log("policy_child login sim  o");
      login_msg(login_data, sim_data);

    }
    else { //심구매하지 않는 유저일경우
      write_log("tt_login not found sim : " + login_data.imsi)
      var mcc = login_data.imsi.slice(0, 3)
      var mnc = login_data.imsi.slice(3, 5)
      var imei = imeigc.randomIMEI_fullRandom();

      var match_sim_check = 'imsi = "' + login_data.imsi + '"';
      var match_sim_checker = realm.objects('SIM').filtered(match_sim_check);

      if (user_checker[0].user_sim_imsi != login_data.imsi && user_checker[0].user_sim_imsi != '0') {
        var old_sim_check = 'imsi = "' + user_checker[0].user_sim_imsi + '"';
        var old_sim_checker = realm.objects('SIM').filtered(old_sim_check);


        //그전에 매칭되었던 심인 경우 삭제
        if (old_sim_checker.length > 0) {
          realm.write(() => {
            realm.delete(old_sim_checker)
          });
        }
      }



      //매치된 심이 있는지 확인
      if (match_sim_checker.length > 0) {
        write_log("match_sim_checker.length : " + match_sim_checker.length)
        realm.write(() => {
          realm.delete(match_sim_checker)

          var SIM = realm.create('SIM', {
            user_id: login_data.user_id,
            imsi: login_data.imsi,
            imei: imei,
            mcc: mcc,
            mnc: mnc,
            sim_type: sim_data.join_type,
          });
          user_checker[0].user_sim_imsi = login_data.imsi;
        });
      }
      else {
        realm.write(() => {
          var SIM = realm.create('SIM', {
            user_id: login_data.user_id,
            imsi: login_data.imsi,
            imei: imei,
            mcc: mcc,
            mnc: mnc,
            sim_type: sim_data.join_type,
          });
          user_checker[0].user_sim_imsi = login_data.imsi;
        });
      }



      sim_data.imsi = login_data.imsi;
      login_msg(login_data, sim_data);
      console.log("policy_child login sim  x");
    }
  }
}
//로그인 처리 함수
function login(dicdata) {
  var login_data = new Object();
  var sim_data = new Object();

  var command_line = dicdata;
  login_data.command = command_line['command'];
  login_data.sub_command = command_line['data1'];
  login_data.seq = command_line['data2'];
  login_data.tcp_fd = command_line['data3'];
  login_data.user_id = command_line['data4'];
  login_data.user_pw = command_line['data5'];
  login_data.app_type = parseInt(command_line['data6']);
  login_data.imsi = command_line['data7'];
  login_data.encpwd = psw_encryption(login_data.user_pw);
  login_data.port = command_line['port'];

  sim_data.join_type = 0
  sim_data.user_serial = 0
  sim_data.credit = 0
  sim_data.imsi = 0
  sim_data.msisdn = 0
  sim_data.expire_match_date = 0

  var user_check = 'user_id = "' + login_data.user_id + '" AND user_pw = "' + login_data.encpwd + '"';
  var facebook_check = 'user_id = "' + login_data.user_id + '"';
  var now = Date.now();

  var user_checker = realm.objects('USER').filtered(user_check);

  if (user_checker.length > 0) { //if user is found
    if (user_checker[0].join_type == 1) { // ttgo 일경우
      tt_login(login_data)
    }
    else {

      var user_sim_check = 'imsi = "' + user_checker[0].imsi + '" AND expire_match_date >"' + now + '"';
      var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

      sim_data.user_serial = user_checker[0].user_serial;
      sim_data.credit = user_checker[0].credit;
      sim_data.join_type = user_checker[0].join_type;

      if (user_sim_checker.length > 0) { //심구매 유저일경우
        var imsi = user_sim_checker[0].imsi
        var msisdn = user_sim_checker[0].msisdn
        var expire_match_date = user_sim_checker[0].expire_match_date

        write_log("policy_child login sim  o");
        login_msg(login_data, sim_data);

      }
      else { //심구매하지 않는 유저일경우

        login_msg(login_data, sim_data);
        write_log("policy_child login sim  x");

      }

    }
  }
  else { //if user is not found
    // return command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|FAIL|";
    var msg = login_data.command + "|" + login_data.sub_command + "|" + login_data.seq + "|" + login_data.tcp_fd + "|FAIL|";
    process.send({
      data: msg,
      port: login_data.port
    });
    console.log("sim x", user_checker[0], msg);
    write_log("policy_child login user is not found sim x : " + msg)
  }
}

// 유닉스 타임스탬프 문자로 변환 함수
function timeConverter(UNIX_timestamp) {
  var a = new Date(UNIX_timestamp);
  var months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = year + '-' + month + '-' + date + ' ' + hour + ':' + min + ':' + sec;
  return time;
}


//fcm_key 새로 만드는 함수
function fcm_key_renewal(dicdata) {
  var command_line = dicdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var user_serial = command_line['data3'];
  var fcm_key = command_line['data4'];
  var user_serial_check = 'user_serial = "' + user_serial + '"';
  var port = command_line['port'];
  var user_serial_checker = realm.objects('USER').filtered(user_serial_check);
  if (user_serial_checker.length > 0) {
    realm.write(() => {
      user_serial_checker[0].fcm_push_key = fcm_key;
    });
    console.log("SUCCESS : fcm_push_key is updated");
    write_log("policy_child fcm_key_renewal SUCCESS : fcm_push_key is updated");
    var msg = command + "|" + sub_command + "|" + seq + "|SUCCESS|";
    var dbmsg = "DB|D02|" + user_serial + "|" + fcm_key + "|";
    process.send({
      data: msg,
      port: port
    });
    addon_child.send_data(dbmsg);
    console.log(msg);
    write_log("policy_child fcm_key_renewal SUCCESS  dbmsg : " + dbmsg + " msg : " + msg);
  }
  else {
    console.log("ERR-fcm_push_key: user_SERIAL is not found");
    write_log("policy_child fcm_key_renewal ERR: user_SERIAL is not found");

    // return command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|FAIL|";
    var msg = command + "|" + sub_command + "|" + seq + "|FAIL|";
    process.send({
      data: msg,
      port: port
    });
    console.log(msg);
    write_log("policy_child fcm_key_renewal ERR : " + msg);
  }
}
//voip_key 새롭게 만들어주는 함수
function voip_key_renewal(dicdata) {
  var command_line = dicdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var user_serial = command_line['data3'];
  var voip_key = command_line['data4'];
  var port = command_line['port'];

  var user_serial_check = 'user_serial = "' + user_serial + '"';
  var user_serial_checker = realm.objects('USER').filtered(user_serial_check);
  if (user_serial_checker.length > 0) {
    realm.write(() => {
      user_serial_checker[0].voip_push_key = voip_key;
    });
    var msg = command + "|" + sub_command + "|" + seq + "|SUCCESS|";
    var dbmsg = "DB|D03|" + user_serial + "|" + voip_key + "|";

    process.send({
      data: msg,
      port: port
    });
    addon_child.send_data(dbmsg);
    console.log(msg);
    write_log("policy_child voip_key_renewal : " + msg);

  }
  else {
    // return command + "|" + sub_command + "|" + seq + "|" + tcp_fd + "|FAIL|";
    var msg = command + "|" + sub_command + "|" + seq + "|FAIL|";
    process.send({
      data: msg,
      port: port
    });
    console.log(msg);
    write_log("policy_child voip_key_renewal : " + msg);

  }
}
//recv : Policy|TS07|Seq|serial|id|auto_flag|
//send : websock_fd, id , auto_flag

//auto_flag를 업데이트해주는 함수
function auto_flag_renewal(dicdata) {

  var command_line = dicdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var user_serial = command_line['data3'];
  var id = command_line['data4'];
  var auto_flag = command_line['data5'];
  var port = command_line['port'];

  try {
    var user_check = 'user_serial = "' + user_serial + '" AND user_id = "' + id + '"';
    var user_checker = realm.objects('USER').filtered(user_check);

    if (user_checker.length == 1) { //user 정보가 맞을경우

      var user_pid = user_checker[0].user_pid

      realm.write(() => {
        user_checker[0].auto_flag = parseInt(auto_flag);
      });
      console.log("auto_flag_renewal success");
      //Policy|CS6|success|auto_flag|
      var msg = command + "|" + sub_command + "|" + seq + "|success|" + auto_flag + "|"
      var dbmsg = "DB|D04|" + user_pid + "|" + auto_flag + "|"

      write_log("policy_child auto_flag_renewal msg : " + msg);
      write_log("policy_child auto_flag_renewal dbmsg : " + dbmsg);


      process.send({
        data: msg,
        port: port
      });
      addon_child.send_data(dbmsg);

    }
    else { // user 정보가 맞지 않을경우
      console.log("auto_flag renewal false : 맞지 않는 유저 정보입니다.");
      var msg = command + "|" + sub_command + "|" + seq + "|fail|" + auto_flag + "|"
      process.send({
        data: msg,
        port: port
      });
      write_log("policy_child auto_flag_renewal error msg : " + msg);

    }

  }
  catch (e) {
    console.log(e, " auto_flag_renewal error")
    write_log("policy_child auto_flag_renewal error: " + e);

  }
}

//심구매 처리 msg를 만들고 전달하는 함수
function buy_sim_msg(buy_sim_data, sim_data) {
  var now = Date.now();

  var msg = buy_sim_data.command + "|CS1|" + buy_sim_data.seq + "|" + sim_data.msisdn + "|" + sim_data.imsi + "|" + sim_data.credit + "|" + timeConverter(sim_data.expire_match_date) + "|0:0:0|0:0:0|0:0:0|0:0:0|0:0:0|0|0|0|";
  process.send({
    data: msg,
    port: buy_sim_data.port
  });
  write_log("policy_child buy_sim msg : " + msg);

  var buy_sim_msg = "DB|D05|" + sim_data.credit + "|" + sim_data.user_pid + "|" + timeConverter(sim_data.expire_match_date) + "|" + sim_data.imsi + "|" + sim_data.user_id + "|" + sim_data.user_serial + "|" + sim_data.msisdn + "|" + sim_data.sim_price * 10 + "|0|SIM|" + sim_data.credit * 10 + "|" + buy_sim_data.erroer + "|" + timeConverter(now) + "|" + buy_sim_data.description + "|"
  addon_child.send_data(buy_sim_msg);
  write_log("policy_child buy_sim dbmsg : " + buy_sim_msg);

}

//심구매를 처리하는 함수
function buy_sim(dicdata) {
  //Policy|CS2|Seq|serial|id|carrier|join_app_type|order_id|event_flag|


  var buy_sim_data = new Object();
  var sim_data = new Object();

  var command_line = dicdata;
  buy_sim_data.command = command_line['command'];
  buy_sim_data.sub_command = command_line['data1'];
  buy_sim_data.seq = command_line['data2'];
  buy_sim_data.user_serial = command_line['data3'];
  buy_sim_data.user_id = command_line['data4'];
  buy_sim_data.mobileType = command_line['data5'];
  buy_sim_data.port = command_line['port'];

  buy_sim_data.error = 0
  // var join_app_type = parseInt(command_line['data6']);//everytt thepay 사용자 구준용도
  //SIM에서 imsi가 존재해야하고 user_id,user_pid가 없어야한다.
  var now = Date.now();




  sim_data.sim_price = 0
  sim_data.add_time = 0
  sim_data.msisdn = 0
  sim_data.credit = 0
  sim_data.user_pid = 0
  sim_data.user_id = 0
  sim_data.user_serial = 0
  sim_data.msisdn = 0
  sim_data.expire_match_date = 0
  sim_data.imsi = 0



  buy_sim_data.Type = 0;

  //유저가 선택한 통신사
  if (buy_sim_data.mobileType == 'smart') {
    buy_sim_data.Type = 1;
  }
  else if (buy_sim_data.mobileType == 'globe') {
    buy_sim_data.Type = 2;
  }
  else if (buy_sim_data.mobileType == 'Telkom') {
    buy_sim_data.Type = 3;
  }
  else if (buy_sim_data.mobileType == 'XL') {
    buy_sim_data.Type = 4;
  }
  // var mcc = match_sim_checker[0].mcc;
  // var mnc = match_sim_checker[0].mnc;

  var mobile_type = buy_sim_data.mobileType.toUpperCase();
  var global_carrier_check = 'carrier = "' + mobile_type + '"';
  let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);

  try {
    //매치가 되어있지않는 심에 대한 필터링
    var user_check = 'user_id = "' + buy_sim_data.user_id + '" AND user_serial = "' + buy_sim_data.user_serial + '"';
    var user_checker = realm.objects('USER').filtered(user_check);





    if (user_checker.length > 0 && global_carrier_checker.length >  0) { //사용자 체크

      sim_data.credit = user_checker[0].credit;
      sim_data.user_pid = user_checker[0].user_pid;
      sim_data.user_id = user_checker[0].user_id;
      sim_data.user_serial = user_checker[0].user_serial;

      sim_data.sim_price = global_carrier_checker[0].simprice
      sim_data.add_time = global_carrier_checker[0].add_time

      //user credit check

      if (sim_data.credit >= sim_data.sim_price) { // if credit is to buy
        // find use to sim

        if (user_sim_checker.length > 0) { // 심이 이미 있는경우 (연장인경우)

          var user_sim_check = 'expire_match_date  >"' + now + '" AND user_id = "' + buy_sim_data.user_id + '" ';
          var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

          console.log("sim_data.add_time : " + sim_data.add_time)
          console.log("user_sim_checker[0].expire_match_date : " + user_sim_checker[0].expire_match_date)


          sim_data.msisdn = user_sim_checker[0].msisdn;
          sim_data.expire_match_date = user_sim_checker[0].expire_match_date + sim_data.add_time;
          sim_data.imsi = user_sim_checker[0].imsi;

          console.log("SIM EXTEND")
          buy_sim_data.description = buy_sim_data.mobileType + " / " + sim_data.msisdn;
          sim_data.credit = sim_data.credit - sim_data.sim_price * 10
          // sim_data.expire_match_date =   sim_data.expire_match_dat + sim_data.add_time;
          realm.write(() => {
            user_checker[0].credit = sim_data.credit; //크래딧 차감
            user_sim_checker[0].expire_match_date = sim_data.expire_match_date;
          });


          buy_sim_data.error = 100

          buy_sim_msg(buy_sim_data, sim_data)
        }
        else { //심이 없는경우(구매하는 경우)
          var match_sim_check = 'expire_match_date < ' + now + 'AND mobileType = ' + buy_sim_data.Type + ' AND sim_type = 0';
          var match_sim_checker = realm.objects('SIM').filtered(match_sim_check);

          if (match_sim_checker.length > 0) {
            console.log("BUY SIM ")
            buy_sim_data.error = 100
            sim_data.imsi = match_sim_checker[0].imsi;
            sim_data.credit = sim_data.credit - sim_data.sim_price * 10;
            //크래딧 500 차감, 심과 사용자 매칭, tb_credit_history입력

            sim_data.expire_match_date = now + sim_data.add_time;

            realm.write(() => {
              user_checker[0].credit = sim_data.credit; //크래딧 차감
              user_checker[0].user_sim_imsi = sim_data.imsi;
              match_sim_checker[0].user_pid = user_checker[0].user_pid;
              match_sim_checker[0].user_id = user_checker[0].user_id;
              match_sim_checker[0].user_serial = user_checker[0].user_serial;
              match_sim_checker[0].expire_match_date = sim_data.expire_match_date;
            });
            sim_data.msisdn = match_sim_checker[0].msisdn;

            buy_sim_msg(buy_sim_data, sim_data)
            var try_lur = "LUR|TRY|" + sim_data.imsi + "|$" + sim_data.port;
            process.send({
              data: try_lur,
              port: sim_data.port
            });

          }
          else {
            console.log("사용가능할수 있는 심이 없습니다.")
            var msg = "Policy|CS2|Seq|not available number|-100|";
            write_log("policy_child buy_sim msg error : " + msg);
            process.send({
              data: msg,
              port: sim_data.port
            });
          }
        }

      }
      else {
        console.log("크래딧이 부족합니다. ")
        var msg = "Policy|CS2|Seq|not enough credit|-101|";
        write_log("policy_child buy_sim msg error : " + msg);
        process.send({
          data: msg,
          port: sim_data.port
        });

      }
    }
    else {
      console.log(user_checker.length);
      console.log("존재하지 않는 사용자입니다.")
      write_log("policy_child buy_sim  error : 존재하지 않는 사용자입니다");

    }

  }
  catch (e) {
    console.log(e, "buy_sim error")
    write_log("policy_child buy_sim  error : " + e);
  }
}

//크래딧 구매 현재 틀만 만들어져 있는 상태
function top_up(dictdata) {

  //Policy|CS7|Seq|serial|id|topup_price|join_app_type|description|topup_method|order_id|event_flag|
  var command_line = dicdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var user_serial = command_line['data3'];
  var user_id = command_line['data4'];
  var topup_price = command_line['data5'];
  var join_app_type = command_line['data6'];
  var description = command_line['data7'];
  var topup_method = command_line['data8'];
  var order_id = command_line['data9'];
  var event_flag = command_line['data10'];
  var port = command_line['port'];

  //update tb_user set credit = credit + 7500 , charge_cnt = charge_cnt+1 , coupon =coupon+1 where pid = 3004
  //UPDATE tb_user_test set credit = credit + 7500, charge_cnt = charge_cnt + 1, coupon =coupon+1 WHERE pid = user_checker[0].user_pid


  var user_check = 'user_id = "' + user_id + '" AND user_serial = "' + user_serial + '"';
  var user_checker = realm.objects('USER').filtered(user_check);
  var sim_checker = realm.objects('SIM').filtered(sim_check);
  var user_sim_check = 'user_pid =  "' + user_checker[0].user_pid + '"';
  var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  if (user_checker.length > 0 && user_sim_checker.length > 0) {

    var credit = user_checker[0].credit;
    var user_pid = user_checker[0].user_pid;
    var user_id = user_checker[0].user_id;
    var user_serial = user_checker[0].user_serial;
    var credit = user_checker[0].credit;
    var credit = user_checker[0].credit;
    var msisdn = user_sim_checker[0].msisdn;
    credit = credit + topup_price;
    realm.write(() => {
      user_checker[0].credit = credit
    })
    var db_top_up_msg = "DB|D06|" + user_pid + "|" + user_id + "|" +
      user_serial + "|" + credit + "|1|1|" + description + "|" + timeConverter(Date.now()) + "|" +
      credit + "|" + event_flag + "|" + msisdn + "|ACCOUNT|0|TOPUP|";
    var msg = "Policy|CS7|" + seq + "|success|" + topup_price + "|";
    write_log("policy_child top_up  msg : " + msg);
    write_log("policy_child top_up  dbmsg : " + db_top_up_msg);
    process.send({
      data: msg,
      port: port
    });
    addon_child.send_data(db_top_up_msg);
  }
  else {
    console.log("ERROR top_up");
    write_log("policy_child top_up error");
  }
}
