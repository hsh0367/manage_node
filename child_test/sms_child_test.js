console.log("[SMS] ON")

var Realm = require('realm');
// const chema = require('../realm_test.js')
const chema = require('../global.js')
const global_value = require('../global_value.js')
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");
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
  fs.writeFile('./log/child/sms_child_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}

let realm = new Realm({
  path: '/home/ubuntu/manage_node/object_data_copy_file.realm',
  deleteRealmIfMigrationNeeded: true,
  disableFormatUpgrade: true,
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST, chema.GLOBALCARRIER_TEST],
});

var pdu = require('node-pdu');

process.on('message', (value) => {
  console.log("sms is on");
  command_classifier(value.data);
});

function command_classifier(data) {
  switch (data['data1']) {
    case 'SMSOUT': //테이블 체크
      //call function
      console.log("SMSOUT ");
      sms_out(data);
      break;
    case 'SMSIN': //로그인
      //call function
      console.log("SMSIN");
      sms_in(data);
      break;
    case 'SMSRESULT': //회원가입
      //call function
      console.log("SMSRESULT");
      sms_result(data);
      break;

    default:
      console.log("[SMS] not find sub command");
  }
}

function area_no_check(msisdn) { // return area_no
  var number = msisdn + "";
  for (var i = 8; i > 0; i--) {
    try {
      area_no = parseInt(number.slice(0, i))
    }
    catch (e) {
      console.log(e);
      write_log("area_no_check parser error : " + e + " msisdn : " + msisdn)
    }
    try {
      var area_check = 'area_no = ' + area_no + '';
      var area_checker = realm.objects('RATE').filtered(area_check);
      if (area_checker.length > 0) { //국가 넘버 찾을경우
        return area_checker;
        break;
      }
      else { //국가 넘버 못찾을경우
        write_log("no check area_no : " + area_no);
        console.log("no check area_no : " + area_no);
      }
      if (i == 1) {
        return 0
      }
    }
    catch (e) {
      console.log(e)
    }
  }
}

function is_local_check(outbound, imsi) {

  // return phone_number is local
  // return 0 is not local number sip
  // return 1 is not phone_number

  var number = '' + outbound;
  var outbound_1 = number.slice(0, 1)
  console.log("is local : " + number);
  write_log("is local : " + number)

  //앞자리가 0이면 기본적으로 로컬에 전화를 거는것이므로 전화번호 반환
  if (outbound_1 == '0') {
    // is local
    console.log(number)
    return number

  }
  else {
    var carrier_id = imsi.slice(0, 5)
    var global_carrier_check = 'carrier_id = ' + carrier_id + '';
    var global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
    if (global_carrier_checker.length > 0) {
      //첫째 자리가 0이 아닐경우
      //고객이 가지고 있는 sim의 imsi 와 global_carrier에 가지고 있는 통신사 코드를 비교하여 국가 코드를 받아
      //국가코드와 같으면 로컬로 판단한다.

      var country_code = '' + global_carrier_checker[0].country_code
      var code_length = country_code.length
      write_log("dddd" + code_length)
      var outbound_code = number.slice(0, code_length);
      write_log("xxxx" + outbound_code)
      if (outbound_code == country_code) { //is local
        write_log("is local " + number)
        return number
      }
      else { // is sip
        write_log("is not local " + number)
        return 0
      }
    }
    else { // is not phone_number
      return 1
    }
  }
}

//value가 숫자인지 아닌지 판별하는 함수
function filterInt(value) {
  if (/^(\+)?([0-9]+|Infinity)$/.test(value))
    return Number(value);
  return NaN;
}

//sms_cnt 값을 체크하는 함수 127 기준으로 초과시 0으로 변환 아닐경우 1증가
function sms_cnt_check(send_sms_cnt, user_sim_checker) {

  if (send_sms_cnt == 127) {
    send_sms_cnt = 0
    realm.write(() => {
      user_sim_checker[0].send_sms_cnt = send_sms_cnt;
    })
  }
  else {
    send_sms_cnt = send_sms_cnt + 1
    realm.write(() => {
      user_sim_checker[0].send_sms_cnt = send_sms_cnt
    })
  }
}

//문자발신 결과 msg를 만들어 보내는 함수
function sms_out_msg(sms_out_data, sim_data) {
  var now = Date.now();
  //SMS|SMSOUT|SEQ|과금금액|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|sim_serial_no|error|
  var msg = "SMS|SMSOUT|" + sms_out_data.seq + "|" + sim_data.smsout_price + "|" + sim_data.imei + "|" + sim_data.tmsi + "|" + sim_data.kc + "|" + sim_data.cksn + "|" + sim_data.msisdn + "|" + sim_data.send_sms_cnt + "|" + sim_data.sim_id + "|" + sim_data.sim_serial_no + "|" + sms_out_data.error + "|" + sim_data.lac + "|" + sim_data.fcm_push_key + "|" + 0 + "|" + sim_data.app_type + "|" + sim_data.smsc + "|" + sim_data.mp_ip + "|" + sim_data.mp_port + "|"

  process.send({
    data: msg,
    port: sms_out_data.port
  });
  console.log(msg);
}

//ttgo 문자 발신을 처리하는 함수
//user_checker 유저객체
//sms_out_data 받은 데이터 오브젝트
function tt_sms_out(sms_out_data, user_checker) {
  var sim_data = new Object();

  var user_sim_check = 'user_id = "' + sms_out_data.user_id + '" AND imsi = "' + sms_out_data.sim_imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  //SMS|SMSOUT|SEQ|과금금액|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|sim_serial_no|error|
  var check_outbound = filterInt(sms_out_data.outbound)
  console.log("check_outbound : " + check_outbound)

  if (check_outbound != NaN) { // is number
    var outbound_n = is_local_check(sms_out_data.outbound, sms_out_data.sim_imsi)
    console.log("outbound_n : " + outbound_n)
    if (outbound_n != 0) { // is local

      //필요데이터 초기화
      var carrier_id = sms_out_data.sim_imsi.slice(0, 5)
      var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
      let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);



      if (user_sim_checker.length > 0 && global_carrier_checker.length > 0) { // 유저, 심 그리고 global_carrier에 있을경우

        //유저데이터와 심데이터에서 필요한 데이터 sim_data 오브젝트에 복사
        sim_data.credit = user_checker[0].credit;
        sim_data.fcm_push_key = user_checker[0].fcm_push_key;
        sim_data.join_type = user_checker[0].join_type;
        sim_data.app_type = user_checker[0].app_type;
        sim_data.send_sms_cnt = user_sim_checker[0].send_sms_cnt;
        sim_data.imei = user_sim_checker[0].imei;
        sim_data.tmsi = user_sim_checker[0].tmsi;
        sim_data.kc = user_sim_checker[0].kc;
        sim_data.cksn = user_sim_checker[0].cksn;
        sim_data.msisdn = user_sim_checker[0].msisdn;
        sim_data.sim_id = user_sim_checker[0].sim_id;
        sim_data.sim_serial_no = user_sim_checker[0].sim_serial_no;
        sim_data.lac = user_sim_checker[0].lac;
        sim_data.mcc = user_sim_checker[0].mcc;
        sim_data.mnc = user_sim_checker[0].mnc;



        console.log("mcc mnc : " + sim_data.mcc + sim_data.mnc)


        sim_data.smsout_price = 0;
        sim_data.area_name = global_carrier_checker[0].carrier;
        sim_data.mp_port = global_carrier_checker[0].mp_port;
        sim_data.mp_ip = global_carrier_checker[0].mp_ip;

        sms_cnt_check(sim_data.send_sms_cnt, user_sim_checker)
        sim_data.smsc = global_carrier_checker[0].smsc;

        console.log("credit : " + sim_data.credit)
        console.log("smsout_price : " + sim_data.smsout_price)
        //SMS|SMSOUT|SEQ|과금금액|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|sim_serial_no|error|
        sms_out_msg(sms_out_data, sim_data)
      }
      else {
        sms_out_data.error = 100
        // 유저와심이 없을 경우 sip
        sms_out_msg(sms_out_data, sim_data)
      }
    }
    else { // 로컬 번호가 아닌경우 is sip
      console.log("[SMSOUT] is not local number")
    }
  }
  else {
    //ERR is outbound not found
    console.log("[SMSOUT] outbound is not number ");
  }
}

function sms_out(dictdata) {
  //IN - SMS|SMSOUT|SEQ|sim_imsi|tcp_id|id|outbound|
  //OUT - SMS|SMSOUT|SEQ|과금금액|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|sim_serial_no|

  var sim_data = new Object();
  var sms_out_data = new Object();
  sms_out_data.command = dictdata['command'];
  sms_out_data.sub_command = dictdata['data1'];
  sms_out_data.seq = dictdata['data2'];
  sms_out_data.sim_imsi = dictdata['data3'];
  sms_out_data.tcp_id = dictdata['data4'];
  sms_out_data.user_id = dictdata['data5'];
  sms_out_data.outbound = dictdata['data6'];
  sms_out_data.port = dictdata['port'];
  sms_out_data.error = 0

  sim_data.credit = 0
  sim_data.fcm_push_key = 0
  sim_data.join_type = 0
  sim_data.app_type = 0
  sim_data.send_sms_cnt = 0
  sim_data.imei = 0
  sim_data.tmsi = 0
  sim_data.kc = 0
  sim_data.cksn = 0
  sim_data.msisdn = 0
  sim_data.sim_id = 0
  sim_data.sim_serial_no = 0
  sim_data.lac = 0
  sim_data.smsout_price = 0
  sim_data.smsc = "0"
  sim_data.mp_port = "0"
  sim_data.mp_ip = "0"

  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.

  // 유저 체크
  var user_check = 'user_id = "' + sms_out_data.user_id + '"';
  let user_checker = realm.objects('USER').filtered(user_check);
  if (user_checker.length > 0) {


    sim_data.join_type = user_checker[0].join_type;

    if (sim_data.join_type = 1) {
      tt_sms_out(sms_out_data, user_checker);
    }
    else {

      var user_sim_check = 'user_id = "' + sms_out_data.user_id + '" AND imsi = "' + sms_out_data.sim_imsi + '" AND expire_match_date > ' + now;
      let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);


      //SMS|SMSOUT|SEQ|과금금액|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|sim_serial_no|error|
      var check_outbound = filterInt(sms_out_data.outbound)
      console.log("check_outbound : " + check_outbound)

      if (check_outbound != NaN) { // is number
        var outbound_n = is_local_check(sms_out_data.outbound, sms_out_data.sim_imsi)
        console.log("outbound_n : " + outbound_n)
        if (outbound_n != 0) { // is local


          var carrier_id = sms_out_data.sim_imsi.slice(0, 5)
          var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
          let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);


          if (user_sim_checker.length > 0 && global_carrier_checker.length > 0) { // 유저가 존재하고 심이 있을경우

            sim_data.credit = user_checker[0].credit;
            sim_data.fcm_push_key = user_checker[0].fcm_push_key;
            sim_data.join_type = user_checker[0].join_type;
            sim_data.app_type = user_checker[0].app_type;
            sim_data.send_sms_cnt = user_sim_checker[0].send_sms_cnt;
            sim_data.imei = user_sim_checker[0].imei;
            sim_data.tmsi = user_sim_checker[0].tmsi;
            sim_data.kc = user_sim_checker[0].kc;
            sim_data.cksn = user_sim_checker[0].cksn;
            sim_data.msisdn = user_sim_checker[0].msisdn;
            sim_data.sim_id = user_sim_checker[0].sim_id;
            sim_data.sim_serial_no = user_sim_checker[0].sim_serial_no;
            sim_data.lac = user_sim_checker[0].lac;
            sim_data.mcc = user_sim_checker[0].mcc;
            sim_data.mnc = user_sim_checker[0].mnc;

            sim_data.smsout_price = global_carrier_checker[0].smsout_price;
            sim_data.area_name = global_carrier_checker[0].carrier;
            sim_data.mp_port = global_carrier_checker[0].mp_port;
            sim_data.mp_ip = global_carrier_checker[0].mp_ip;

            sms_cnt_check(sim_data.send_sms_cnt, user_sim_checker)
            sim_data.smsc = global_carrier_checker[0].smsc;

            console.log("credit : " + sim_data.credit)
            console.log("smsout_price : " + sim_data.smsout_price)
            if (sim_data.credit > sim_data.smsout_price) { // 1번 문자 가능할 크래딧일 경우
              //SMS|SMSOUT|SEQ|과금금액|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|sim_serial_no|error|
              sms_out_msg(sms_out_data, sim_data)
            }
            else {
              //사용가능한 크래딧이 없는 경우
              sms_out_data.error = 101
              sms_out_msg(sms_out_data, sim_data)
            }
          }
          else {
            sms_out_data.error = 100

            // 유저와심이 없을 경우 sip
            sms_out_msg(sms_out_data, sim_data)
          }
        }
        else { // 로컬 번호가 아닌경우 is sip
          write_log("[SMSOUT] is not local number")
          sms_out_data.error = 104
          sms_out_msg(sms_out_data, sim_data)

        }
      }
      else {
        //ERR is outbound not found
        write_log("[SMSOUT] outbound is not number ");
        sms_out_data.error = 105
        sms_out_msg(sms_out_data, sim_data)
      }
    }
  }
  else {
    write_log("sms_out : is not user ")
    sms_out_data.error = 106
    sms_out_msg(sms_out_data, sim_data)
  }

}

// 문자 수신에 대한 처리 msg를 만들고 보내는 함수
function sms_in_msg(sms_in_data, sim_data) {
  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.
  var msg = sms_in_data.command + "|" + sms_in_data.sub_command + "|" + sms_in_data.seq + "|" + sim_data.user_serial + "|" + sim_data.user_id + "|" + sim_data.fcm_push_key + "|" + 0 + "|" + sim_data.app_type + "|" + 0 + "|"
  process.send({
    data: msg,
    port: sms_in_data.port
  });
  write_log(msg)
  var db_sms_in_msg = "DB|D08|SMS-IN|" + sim_data.user_pid + "|" + sim_data.user_serial + "|" + sim_data.user_id + "|" + sim_data.credit + "|" +
    sim_data.imsi + "|" + sms_in_data.outbound + "|" + sim_data.simbank_name + "|" + sim_data.sim_serial_no + "|" + sms_in_data.description + "|" + sms_in_data.price + "|" +
    sms_in_data.credit_flag + "|" + sim_data.area_name + "|" + sms_in_data.content + "|" + sms_in_data.type + "|" + sms_in_data.TYPE + "|" + now + "|" + 0 + "|" + 0 + "|";

  addon_child.send_data(db_sms_in_msg);
  // tb_sms_list (id, user_serial, mobile_number, isAppsend,err_code,simbank_name,sim_imsi, sms_date, join_app_type,credit_pid)
}

//문자 수신에대한 처리를 하는 함수
function sms_in(dictdata) {
  //IN - SMS|SMSIN|SEQ|sim_imsi|sms_pdu|
  //OUT - SMS|SMSIN|SEQ|tcp_id|id|push_key|join_app_type|os_type|
  console.log("sms_in")
  var sms_in_data = new Object();
  var sim_data = new Object();

  var command_line = dictdata;
  sms_in_data.command = command_line['command'];
  sms_in_data.sub_command = command_line['data1'];
  sms_in_data.seq = command_line['data2'];
  sms_in_data.sim_imsi = command_line['data3'];
  sms_in_data.sms_pdu = command_line['data4'];
  sms_in_data.port = command_line['port'];


  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 타임컨버트를 해줄경우 상관이 없다.

  var pdu_data = pdu.parse(sms_in_data.sms_pdu);
  sms_in_data.body = pdu_data._ud._data;
  sms_in_data.outbound = pdu_data._sca._encoded; //상대 방전화번호
  sms_in_data.callerID = pdu_data._address._phone; //발신자 전화번호
  sms_in_data.date = pdu_data._scts._time; //수신 전화시간

  sms_in_data.TYPE = 0;
  sms_in_data.type = 0;
  sms_in_data.content = "SMS"
  sms_in_data.credit_flag = 103
  sms_in_data.price = 0
  sms_in_data.description = 0

  sim_data.user_id = 0
  sim_data.user_serial = 0
  sim_data.fcm_push_key = 0
  sim_data.join_type = 0
  sim_data.app_type = 0
  sim_data.user_pid = 0
  sim_data.credit = 0

  sim_data.imsi = 0
  sim_data.simbank_name = 0
  sim_data.sim_serial_no = 0
  sim_data.msisdn = 0

  sim_data.area_name = 0
  console.log(sms_in_data.sim_imsi)

  var user_sim_check = 'imsi = "' + sms_in_data.sim_imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);


  console.log(user_sim_checker[0].user_id)
  var user_check = 'user_id = "' + user_sim_checker[0].user_id + '" AND user_sim_imsi = "' + user_sim_checker[0].imsi + '"';
  let user_checker = realm.objects('USER').filtered(user_check);


  var carrier_id = sms_in_data.sim_imsi.slice(0, 5)
  var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
  let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);


  // 유저,심, 서비스하는 국가 이통사가 맞을경우
  if (user_sim_checker.length > 0 && user_checker.length > 0 && global_carrier_checker.length > 0) {

    sim_data.user_id = user_checker[0].user_id;
    sim_data.user_serial = user_checker[0].user_serial;
    sim_data.fcm_push_key = user_checker[0].fcm_push_key;
    sim_data.join_type = user_checker[0].join_type;
    sim_data.app_type = user_checker[0].app_type;
    sim_data.user_pid = user_checker[0].user_pid;
    sim_data.credit = user_checker[0].credit;

    sim_data.imsi = user_sim_checker[0].imsi;
    sim_data.simbank_name = user_sim_checker[0].simbank_name;
    sim_data.sim_serial_no = user_sim_checker[0].sim_serial_no;
    sim_data.msisdn = user_sim_checker[0].msisdn;
    sim_data.mcc = user_sim_checker[0].mcc;
    sim_data.mnc = user_sim_checker[0].mnc;

    sim_data.area_name = global_carrier_checker[0].carrier;
    sim_data.price = global_carrier_checker[0].smsin_price;

    // sms_in_data.price = global_carrier_checker[0].smsin_price;
    sms_in_data.description = sms_in_data.outbound + " / " + sim_data.msisdn;

    //ttgo 일경우 문자에 대한 관리를 하지 않지만
    //everytt 일경우 광고문자자 해외에서 오는 문자를 관리하기 때문에 해외에서 오는 문자의 경우 DB에 기록만 한다.
    //아닐경우 문자를 보내준다.
    if (sim_data.join_type == 1) {
      sms_in_msg(sms_in_data, sim_data)
    }
    else {
      var phone_number = sms_in_data.outbound

      if (phone_number[0] != 0) {
        var ussd_msg = "DB|MSG_USSD|" + sim_data.imsi + "|" + sms_in_data.body + "|" + sms_in_data.date + "|" + sms_in_data.outbound + "|"
        addon_child.send_data(ussd_msg);
      }
      else {
        sms_in_msg(sms_in_data, sim_data)
      }
    }
  }
  else {
    sms_in_data.description = sms_in_data.outbound + " / " + 0;
    sms_in_msg(sms_in_data, sim_data)
  }
}

//문자 결과에 대한 처리 msg를 생성하고 보내는 함수
function sms_result_msg(sms_result_data, sim_data) {
  var now = Date.now();
  var sms_reslut_msg = "DB|D08|SMSRESULT|" + sim_data.user_pid + "|" + sim_data.user_serial + "|" + sim_data.user_id + "|" + sim_data.credit + "|" +
    sim_data.imsi + "|" + sms_result_data.outbound + "|" + sim_data.simbank_name + "|" + sim_data.sim_serial_no + "|" + sms_result_data.description + "|" + sms_result_data.price + "|" +
    sms_result_data.credit_flag + "|" + sim_data.area_name + "|" + sms_result_data.content + "|" + sms_result_data.type + "|" + sms_result_data.TYPE + "|" + now + "|" + sms_result_data.error_code + "|" + sms_result_data.sms_result + "|"
  console.log(sms_reslut_msg);
  addon_child.send_data(sms_reslut_msg);
}


//ttgo에 대한 문자 결과를 처리하는 함수
//sms_result_data : 받은 데이터들의 오브젝트
//user_checker : 해당 유저 객체
function tt_sms_result(sms_result_data, user_checker) {
  var sim_data = new Object();
  var user_sim_check = 'imsi = "' + sms_result_data.sim_imsi + '" AND user_id ="' + sms_result_data.user_id + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  sim_data.user_id = user_checker[0].user_id;
  sim_data.user_serial = user_checker[0].user_serial;
  sim_data.fcm_push_key = user_checker[0].fcm_push_key;
  sim_data.join_type = user_checker[0].join_type;
  sim_data.app_type = user_checker[0].app_type;
  sim_data.user_pid = user_checker[0].user_pid;
  sim_data.credit = user_checker[0].credit;

  sim_data.imsi = 0;
  sim_data.simbank_name = 0;
  sim_data.sim_serial_no = 0;
  sim_data.msisdn = 0;
  sim_data.area_name = 0;
  var carrier_id = sms_result_data.sim_imsi.slice(0, 5)
  var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
  let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);

  if (user_sim_checker.length > 0 && global_carrier_checker.length > 0) {
    sim_data.imsi = user_sim_checker[0].imsi;
    sim_data.simbank_name = user_sim_checker[0].simbank_name;
    sim_data.sim_serial_no = user_sim_checker[0].sim_serial_no;
    sim_data.msisdn = user_sim_checker[0].msisdn;
    sim_data.mcc = user_sim_checker[0].mcc;
    sim_data.mnc = user_sim_checker[0].mnc;


    sim_data.area_name = global_carrier_checker[0].carrier;
    sms_result_data.description = sms_result_data.outbound + " / " + sim_data.msisdn;
    if (sms_result_data.sms_result == 'SUCCESS') {
      //크래딧  차감, 심과 사용자 매칭, tb_credit_history입력
      //ttgo일 경우 크래딧 차감을 하지 않는다. 하지만 언제 룰이 바뀔지도 모른다.
      //sim_data.credit = sim_data.credit - sms_result_data.price
      // realm.write(() => {
      //   user_checker[0].credit = sim_data.credit; //크래딧 차감
      // });
      sms_result_msg(sms_result_data, sim_data)
    }
    else if (sms_result_data.sms_result == 'FAIL') { //문자 실패인 경우
      console.log("is FAIL")
      sms_result_msg(sms_result_data, sim_data)
    }
  }
}

//문자 결과 처리를 하는 함수
function sms_result(dictdata) {
  //IN - SMS|SMSRESULT|SEQ|sim_imsi|tcp_id|id|outbound|과금 금액|
  //OUT - ""
  var sms_result_data = new Object();
  var sim_data = new Object();
  var command_line = dictdata;

  sms_result_data.command = command_line['command'];
  sms_result_data.sub_command = command_line['data1'];
  sms_result_data.seq = command_line['data2'];
  sms_result_data.sim_imsi = command_line['data3'];
  sms_result_data.tcp_id = command_line['data4'];
  sms_result_data.user_id = command_line['data5'];
  sms_result_data.outbound = command_line['data6'];
  sms_result_data.price = parseInt(command_line['data7']);
  sms_result_data.sms_result = command_line['data8'];
  sms_result_data.error_code = command_line['data9'];

  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.
  sms_result_data.type = 0;
  sms_result_data.TYPE = 1;
  sms_result_data.content = "SMS"
  sms_result_data.credit_flag = 103
  sms_result_data.description = "0"

  var user_check = 'user_id = "' + sms_result_data.user_id + '"';
  let user_checker = realm.objects('USER').filtered(user_check);
  var user_sim_check = 'imsi = "' + sms_result_data.sim_imsi + '" AND expire_match_date > ' + now + ' AND user_id ="' + sms_result_data.user_id + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);


  var carrier_id = sms_result_data.sim_imsi.slice(0, 5)
  var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
  let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);


  sim_data.user_id = 0
  sim_data.user_serial = 0
  sim_data.fcm_push_key = 0
  sim_data.join_type = 0
  sim_data.app_type = 0
  sim_data.user_pid = 0
  sim_data.credit = 0
  sim_data.imsi = 0
  sim_data.simbank_name = 0
  sim_data.sim_serial_no = 0
  sim_data.msisdn = 0
  sim_data.area_name = 0

  if (user_checker.length > 0) {
    sim_data.user_id = user_checker[0].user_id;
    sim_data.user_serial = user_checker[0].user_serial;
    sim_data.fcm_push_key = user_checker[0].fcm_push_key;
    sim_data.join_type = user_checker[0].join_type;
    sim_data.app_type = user_checker[0].app_type;
    sim_data.user_pid = user_checker[0].user_pid;
    sim_data.credit = user_checker[0].credit;

    if (sim_data.join_type == 1) {//ttgo 일경우
      tt_sms_result(sms_result_data, user_checker)
    }
    else if (sim_data.join_type == 0 && user_sim_checker.length > 0 && global_carrier_checker.length > 0 ) {


      sim_data.imsi = user_sim_checker[0].imsi;
      sim_data.simbank_name = user_sim_checker[0].simbank_name;
      sim_data.sim_serial_no = user_sim_checker[0].sim_serial_no;
      sim_data.msisdn = user_sim_checker[0].msisdn;
      sim_data.mcc = user_sim_checker[0].mcc;
      sim_data.mnc = user_sim_checker[0].mnc;

      sim_data.area_name = global_carrier_checker[0].carrier;
      sms_result_data.description = sms_result_data.outbound + " / " + sim_data.msisdn;
      if (sms_result_data.sms_result == 'SUCCESS') { //문자가 성공일경우
        //크래딧  차감, 심과 사용자 매칭, tb_credit_history입력
        sim_data.credit = sim_data.credit - sms_result_data.price
        realm.write(() => {
          user_checker[0].credit = sim_data.credit; //크래딧 차감
        });
        sms_result_msg(sms_result_data, sim_data)
      }
      else if (sms_result_data.sms_result == 'FAIL') { //문자 실패인 경우
        console.log("is FAIL")
        sms_result_msg(sms_result_data, sim_data)
      }
    }
    else {
      write_log("sms_result : is not user")
    }
  }
}
