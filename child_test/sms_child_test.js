console.log("[SMS] ON")

var Realm = require('realm');
// const chema = require('../realm_test.js')
const chema = require('../global.js')
const global_value = require('../global_value.js')
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");

let realm = new Realm({
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST],
  schemaVersion: 20
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
      console.log("[CALL] not find sub command");
  }
}

function area_no_check(msisdn) { // return area_no


  for (var i = 8; i > 0; i--) {
    try {
      area_no = parseInt(msisdn.slice(0, i))
    }
    catch (e) {
      console.log(e);
      console.log("area_no parser error");
    }
    try {
      var area_check = 'area_no = ' + area_no + '';
      var area_checker = realm.objects('RATE').filtered(area_check);
      if (area_checker.length > 0) { //국가 넘버 찾을경우
        return area_checker[0].area_no;
        break;
      }
      else { //국가 넘버 못찾을경우
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

function is_local_check(outbound) {
  //1 is local
  //2 is sip
  // 0 is not number
  var outbound_1 = outbound.slice(0, 1)
  console.log(outbound_1)
  if (outbound_1 == '0') {
    // is local
    var country_number = global_value.country_code;

    return outbound

  }
  else {
    country = outbound.slice(0, 2)
    console.log(country)

    if (global_value.country_code == parseInt(country)) {
      // is local
      return outbound;

    }
    else {
      // is sip

      return 0
    }
  }
}

function filterInt(value) {
  if (/^(\+)?([0-9]+|Infinity)$/.test(value))
    return Number(value);
  return NaN;
}

function sms_out(dictdata) {
  //IN - SMS|SMSOUT|SEQ|sim_imsi|tcp_id|id|outbound|
  //OUT - SMS|SMSOUT|SEQ|과금금액|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|sim_serial_no|
  var command = dictdata['command'];
  var sub_command = dictdata['data1'];
  var seq = dictdata['data2'];
  var sim_imsi = dictdata['data3'];
  var tcp_id = dictdata['data4'];
  var user_id = dictdata['data5'];
  var outbound = dictdata['data6'];

  ////////////////////////////////////////////////////

  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.

  // 유저 체크
  try {
    var user_check = 'user_id = "' + user_id + '" AND user_sim_imsi = "' + sim_imsi + '"';
    var user_sim_check = 'user_id = "' + user_id + '" AND imsi = "' + sim_imsi + '" AND expire_match_date > ' + now;

    let user_checker = realm.objects('USER').filtered(user_check);
    let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);


    //SMS|SMSOUT|SEQ|과금금액|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|sim_serial_no|error|
    console.log("ss");






    var check_outbound = filterInt(outbound)
    console.log("check_outbound : " + check_outbound)

    if (check_outbound != NaN) { // is number

      var outbound_n = is_local_check(outbound.toString())
      console.log("outbound_n : " + outbound_n)
      if (outbound_n != 0) { // is local



        if (user_checker.length > 0 && user_sim_check.length > 0) { // 유저가 존재하고 심이 있을경우

          if (user_sim_checker[0].send_sms_cnt == 127) {

            realm.write(() => {
              user_sim_checker[0].send_sms_cnt = 0;
            })
          }
          else {
            realm.write(() => {
              user_sim_checker[0].send_sms_cnt = user_sim_checker[0].send_sms_cnt + 1;
            })
          }

          if (user_checker[0].credit > global_value.sms_price) { // 1번 문자 가능할 크래딧일 경우
            //SMS|SMSOUT|SEQ|과금금액|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|sim_serial_no|error|
            var msg = "SMS|SMSOUT|" + seq + "|" + global_value.sms_price + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].kc + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisdn + "|" + user_sim_checker[0].send_sms_cnt + "|" + user_sim_checker[0].sim_id + "|" + user_sim_checker[0].sim_serial_no + "|0|" + user_sim_checker[0].lac + "|" + user_checker[0].fcm_push_key + "|" + user_checker[0].join_type + "|" + user_checker[0].app_type + "|"

            process.send(msg);
            console.log(msg);
          }
          else {
            //사용가능한 크래딧이 없는 경우

            var msg = "SMS|SMSOUT|" + seq + "|" + global_value.sms_price + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].kc + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisdn + "|" + user_sim_checker[0].send_sms_cnt + "|" + user_sim_checker[0].sim_id + "|" + user_sim_checker[0].sim_serial_no + "|101|" + user_sim_checker[0].lac + "|" + user_checker[0].fcm_push_key + "|" + user_checker[0].join_type + "|" + user_checker[0].app_type + "|"

            process.send(msg);
            console.log(msg);
          }

        }
        else {
          // 유저와심이 없을 경우 sip
          //OUT - CALL|CALLOUT|SEQ|tcp_id|id|unit|value|droptime|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|
          //sim_serial_no|simbank_name|isSip|join_app_type|error|area_name|과금방식|isSIP 0- 심 발신 / 1 - sip로 발신
          // var msg = "SMS|SMSOUT|" + seq + "|" + global_value.sms_price + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + user_sim_checker[0].send_sms_cnt + "|" + 0 + "|" + 0 + "|100|"
          var msg = "SMS|SMSOUT|" + seq + "|" + global_value.sms_price + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" +0 + "|" + 0 + "|" + 0 + "|100|" + 0 + "|" + 0 + "|" + 0 + "|"

          process.send(msg);
          console.log(msg);
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
  catch (e) {
    console.log(e);
  }
}

function sms_in(dictdata) {
  //IN - SMS|SMSIN|SEQ|sim_imsi|sms_pdu|
  //OUT - SMS|SMSIN|SEQ|tcp_id|id|push_key|join_app_type|os_type|
  var command_line = dictdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var sim_imsi = command_line['data3'];
  var sms_pdu = command_line['data4'];



  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.


  var pdu_data = pdu.parse(sms_pdu);
  var body = pdu_data._ud._data;
  var outbound = pdu_data._sca._encoded; //상대 방전화번호
  var callerID = pdu_data._address._phone;//발신자 전화번호
  var date = pdu_data._scts._time; //수신 전화시간
  var TYPE = 0
  var user_check = 'user_sim_imsi = "' + sim_imsi + '"';
  var user_sim_check = 'imsi = "' + sim_imsi + '" AND expire_match_date > ' + now;
  let user_checker = realm.objects('USER').filtered(user_check);
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  var description = outbound + " / " + user_sim_checker[0].msisdn;

  try {
    if (user_sim_checker.length > 0 && user_checker.length > 0) {

      var msisdn = user_sim_check[0].msisdn;

      //SMS|SMSIN|SEQ|tcp_id|id|push_key|join_app_type|os_type|
      var msg = command + "|" + sub_command + "|" + seq + "|" + user_checker[0].user_serial + "|" + user_checker[0].user_id + "|" + user_checker[0].fcm_push_key + "|" + user_checker[0].join_type + "|" + user_checker[0].app_type + "|" + user_checker[0].user_id + "|"
      process.send(msg);
      var db_sms_in_msg = "DB|D08|SMS-IN|" + user_checker[0].user_serial + "|" + user_sim_checker[0].imsi + "|" + description + "|" + 0 + "|" + outbound + "|" + TYPE + "|" + 0 + "|" + 0 + "|";
      addon_child.send_data(db_sms_in_msg);
       // tb_sms_list (id, user_serial, mobile_number, isAppsend,err_code,simbank_name,sim_imsi, sms_date, join_app_type,credit_pid)
    }
    else {
      var msg = command + "|" + sub_command + "|" + seq + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 100 + "|"
      process.send(msg);
      var db_sms_in_msg = "DB|D08|SMS-IN|" + 0 + "|" +  0 + "|" + 0 + "|" + 0 + "|" + outbound + "|" + TYPE + "|" + 0 + "|" + 0 + "|";
      addon_child.send_data(db_sms_in_msg);

    }
  }
  catch (e) {
    console.log(e);
  }

}

function sms_result(dictdata) {
  //IN - SMS|SMSRESULT|SEQ|sim_imsi|tcp_id|id|outbound|과금 금액|
  //OUT - ""
  var command_line = dictdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var sim_imsi = command_line['data3'];
  var tcp_id = command_line['data4'];
  var user_id = command_line['data5'];
  var outbound = command_line['data6'];
  var price = command_line['data7'];
  var sms_result = command_line['data8'];
  var error_code = command_line['data9'];

  //////////////////////////////////////////////////////

  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.
  var user_sim_check = 'imsi = "' + sim_imsi + '" AND expire_match_date > ' + now;
  var user_check = 'user_sim_imsi = "' + sim_imsi + '"';


  let user_checker = realm.objects('USER').filtered(user_check);
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  var TYPE = 1;

  //
  // console.log(realm.objects('USER'))
  // console.log(realm.objects('SIM'))
  // console.log(now)

  var description = outbound + " / " + user_sim_checker[0].msisdn;

  if (sms_result == 'SUCCESS') { //전화 연결이 된경우
    //크래딧  차감, 심과 사용자 매칭, tb_credit_history입력
    realm.write(() => {
      user_checker[0].credit = user_checker[0].credit - price * 10; //크래딧 차감
    });
    // var sms_reslut_msg = "DB|D07|" + usSer_checker[0].credit + "|" + user_checker[0].user_pid + "|" + timeConverter(match_sim_checker[0].expire_match_date) + "|" + user_sim_checker[0].imsi + "|" + user_checker[0].user_id + "|" +
    //   user_checker[0].user_serial + "|" + user_sim_checker[0].msisdn + "|" + deducted_credit * 10 + "|0|CALL|" +
    //   user_checker[0].credit * 10 + "|104|" + timeConverter(now) + "|" + description + "|"+s_date+"|"+ c_date+"|"+ e_date+"|"+area_name+"|"+TYPE+"|"+user_checker[0].join_type+"|"+user_sim_checker[0].simbank_name+"|"+user_sim_checker[0].sim_serial_no+"|"+con_id+"|";

    var sms_reslut_msg = "DB|D08|SMS_RESULT|" + user_checker[0].user_serial + "|" + user_sim_checker[0].imsi + "|" + description + "|" + price + "|" + outbound + "|" + TYPE + "|" + sms_result + "|" + error_code + "|";
    console.log(sms_reslut_msg);
    addon_child.send_data(sms_reslut_msg);
  }
  else if (sms_result == 'FAIL') { //전화 연결이 안된경우
    console.log("is FAIL")

    var sms_reslut_msg = "DB|D08|SMS_RESULT|" + user_checker[0].user_serial + "|" + user_sim_checker[0].imsi + "|" + description + "|" + price + "|" + outbound + "|" + TYPE + "|" + sms_result + "|" + error_code + "|";
    console.log(sms_reslut_msg);
    addon_child.send_data(sms_reslut_msg);
    //call log 쌓기
  }
}
