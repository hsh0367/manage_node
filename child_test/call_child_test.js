var Realm = require('realm');
// const chema = require('../realm_test.js')
const chema = require('../global.js')
const global_value = require('../global_value.js')

let realm = new Realm({
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST],
  schemaVersion: 18
});

process.on('message', (value) => {
  console.log("call is on");
  command_classifier(value.data);
});
var reference_number = 0;

function command_classifier(data) {
  switch (data['data1']) {
    case 'CALLOUT': //테이블 체크
      //call function
      console.log("CALLOUT ");
      call_out(data);
      break;
    case 'CALLIN': //회원가입
      //call function
      console.log("CALLIN");
      call_in(data);
      break;
    case 'CALLDROP': //로그인
      //call function
      console.log("CALLDROP");
      call_drop(data);
      break;

    default:
      console.log("[CALL] not find sub command");
  }
}

function area_no_check(msisdn) { // return area_no


  for (var i = 8; i >= 0; i--) {
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
        return area_checker.area_no;
        break;
      }
      else { //국가 넘버 못찾을경우
        console.log("no check area_no : " + i);
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
  if (outbound_1 == '0') {
    // is local

    return true;
  }
  else {
    country = outbound.slice(0, 2)
    console.log(country)

    if (global_value.country_code == parseInt(country)) {
      // is local
      return true;

    }
    else {
      // is sip
      return false;
    }
  }
}

function filterInt(value) {
  if (/^(\+)?([0-9]+|Infinity)$/.test(value))
    return Number(value);
  return NaN;
}

function call_out(dictdata) {
  //IN - CALL|CALLOUT|SEQ|sim_imsi|tcp_id|id|outbound|
  //OUT - CALL|CALLOUT|SEQ|tcp_id|id|unit|value|droptime|imei|tmsi|kc|cksn|msisdn|reference_number|simbank_id|
  //sim_serial_no|simbank_name|isSip|join_app_type|error|area_name|과금방식|isSIP 0- 심 발신 / 1 - sip로 발신

  var command_line = dictdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var sim_imsi = command_line['data3'];
  var tcp_id = command_line['data4'];
  var user_id = command_line['data5'];
  var outbound = command_line['data6'];



  // 유저 체크
  try {
    var user_check = 'user_id = "' + user_id + '" AND user_sim_imsi = "' + sim_imsi + '"';
    var user_sim_check = 'user_id = "' + user_id + '" AND imsi = "' + sim_imsi + '"AND expire_match_date >';

    let user_checker = realm.objects('USER').filtered(user_check);
    let user_sim_checker = realm.objects('USER').filtered(user_sim_check);



    if (reference_number == 127) {
      reference_number = 0;
    }
    else {
      reference_number++;
    }

    var check_outbound = filterInt(outbound)

    if (check_outbound != NaN) { // is number


      if (is_local_check(check_outbound.toString())) { // is local


        var out_sim_area_no = area_no_check(check_outbound)
        var rate_check = 'area_no = ' + out_sim_area_no + '';
        var rate_checker = realm.objects('RATE').filtered(rate_check);

        if (user_checker.length > 0 && user_sim_check.length > 0) { // 유저가 존재하고 심이 있을경우
          var user_credit = user_checker[0].credit;
          var call_value = rate_checker[0].call_value;

          if (user_checker[0].credit > rate_checker[0].call_value) { // 1분동안 통화를 가능할 크래딧일 경우

            var available_time = 0.00;
            available_time_m = user_credit / call_value
            available_time_s = available_time_m.toFiced(2) * 60;



            var msg = "CALL|CALLOUT|" + seq + "|" + tcp_id + "|" + user_id + "|"
            rate_checker[0].call_unit "|" + rate_checker[0].call_value + "|" + available_time_s + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisn + "|" + reference_number + "|" + user_sim_checker[0].simbank_id + "|" +
              user_sim_checker[0].sim_serial_no + "|" + user_sim_checker[0].simbank_name + "|1|" + user_checker[0].app_type + "|0|" + rate_checker[0].area_name + "|0|"
          }
          else {
            //사용가능한 크래딧이 없는 경우

            var msg = "CALL|CALLOUT|" + seq + "|" + tcp_id + "|" + user_id + "|"
            rate_checker[0].call_unit "|" + rate_checker[0].call_value + "|" + 0 + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisn + "|reference_number|" + user_sim_checker[0].simbank_id + "|" +
              user_sim_checker[0].sim_serial_no + "|" + user_sim_checker[0].simbank_name + "|1|" + user_checker[0].app_type + "|error|" + rate_checker[0].area_name + "|0|"


          }

        }
        else { // 유저와심이 없을 경우 sip
          //OUT - CALL|CALLOUT|SEQ|tcp_id|id|unit|value|droptime|imei|tmsi|kc|cksn|msisdn|reference_number|simbank_id|
          //sim_serial_no|simbank_name|isSip|join_app_type|error|area_name|과금방식|isSIP 0- 심 발신 / 1 - sip로 발신

          var msg = "CALL|CALLOUT|" + seq + "|" + tcp_id + "|0|" +
            rate_checker.call_unit "|" + rate_checker.call_value +
            "|0|0|0|0|0|0|" + reference_number + "|0|" +
            "0|0|1|0|error|" + rate_checker.area_name + "|0|"

        }
      }
      else { // 로컬 번호가 아닌경우 is sip



        if (user_checker.length > 0 && user_sim_check.length > 0) { // 유저가 존재하고 심이 있을경우
          var user_credit = user_checker[0].credit;
          var call_value = rate_checker[0].call_value;

          if (user_checker[0].credit > rate_checker[0].call_value) { // 1분동안 통화를 가능할 크래딧일 경우

            var available_time_m = 0.00;
            available_time_m = (user_credit / call_value).toFiced(0)



            available_time_s = available_time_m * 60;



            var msg = "CALL|CALLOUT|" + seq + "|" + tcp_id + "|" + user_id + "|" + rate_checker[0].call_unit "|" + rate_checker[0].call_value + "|" + available_time_s + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisn + "|" + reference_number + "|" + user_sim_checker[0].simbank_id + "|" +
              user_sim_checker[0].sim_serial_no + "|" + user_sim_checker[0].simbank_name + "|1|" + user_checker[0].app_type + "|error|" + rate_checker[0].area_name + "|0|"
          }
          else {
            //사용가능한 크래딧이 없는 경우

            var msg = "CALL|CALLOUT|" + seq + "|" + tcp_id + "|" + user_id + "|" + rate_checker[0].call_unit "|" + rate_checker[0].call_value + "|" + 0 + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisn + "|" + reference_number + "|" + user_sim_checker[0].simbank_id + "|" +
              user_sim_checker[0].sim_serial_no + "|" + user_sim_checker[0].simbank_name + "|1|" + user_checker[0].app_type + "|error|" + rate_checker[0].area_name + "|0|"

          }



        }
        else { //유저와 심이 존재 하지 않을 경우

          var msg = "CALL|CALLOUT|" + seq + "|" + tcp_id + "|0|" +
            rate_checker.call_unit "|" + rate_checker.call_value +
            "|0|0|0|0|0|0|" + reference_number + "|0|" +
            "0|0|1|0|error|" + rate_checker.area_name + "|0|"
        }



      }

    }
    else {
      //ERR is outbound not found
      console.log("ERR is outbound not found");
    }









  }
  catch (e) {
    console.log(e);
  }




}

function call_in(dictdata) {
  //IN - CALL|CALLIN|SEQ|sim_imsi|
  //OUT - CALL|CALLIN|SEQ|tcp_id|id|unit|value|droptime|push_key|voip_key|join_app_type|os_type|os_type 0안드로이드/ 1-ios
  var command_line = dicdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var sim_imsi = command_line['data3'];


}

function call_drop(dictdata) {
  //IN - CALL|CALLDROP|SEQ|TYPE|s_date|c_date|e_date|unit|value|area_name|과금방식|join_app_type|
  //TYPE-CALLOUT/CALLIN, s_date-전화시작 시간, c_date-연결한시간, e_date-종료시간
  // OUT - ""
  var command_line = dicdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var TYPE = command_line['data3'];
  var s_date = command_line['data4'];
  var c_date = command_line['data5'];
  var e_date = command_line['data6'];
  var unit = command_line['data7'];
  var value = command_line['data8'];
  var area_name = command_line['data9'];
  var charging_method = command_line['data10'];
  var join_app_type = command_line['data11'];





}
