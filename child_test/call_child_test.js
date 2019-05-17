console.log("[CALL] ON")
var Realm = require('realm');
const chema = require('../global.js')
const global_value = require('../global_value.js')
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");

let realm = new Realm({
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST],
  schemaVersion: 20
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
  fs.writeFile('./log/child/call_child_log' +dd+".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}
process.on('message', (value) => {
  console.log("call is on");
  command_classifier(value.data);
});

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
  var number = msisdn + "";
  for (var i = 8; i > 0; i--) {
    try {
      area_no = parseInt(number.slice(0, i))
    }
    catch (e) {
      console.log(e);
      console.log("area_no parser error");
    }
    try {
      var area_check = 'area_no = ' + area_no + '';
      var area_checker = realm.objects('RATE').filtered(area_check);
      if (area_checker.length > 0) { //국가 넘버 찾을경우
        return area_checker;
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

  var number = '' + outbound;
  var outbound_1 = number.slice(0, 1)
  console.log("is local : " + number);
  if (outbound_1 == '0') {
    // is local
    var country_number = global_value.country_code;

    return country_number + number.slice(1, -1)

  }
  else {
    country = number.slice(0, 2)
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
  // ^(\+)?([0-9]*)$
  if (/^(\+)?([0-9]+|Infinity)$/.test(value))
    return value;
  return NaN;
}



function reference_number_check(user_id, imsi) {

  var now = Date.now();
  var user_sim_check = 'user_id = "' + user_id + '" AND imsi = "' + sim_imsi + '" AND expire_match_date > ' + now;
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

}

function call_out(dictdata) {
  //IN - CALL|CALLOUT|SEQ|sim_imsi|tcp_id|id|outbound|
  //OUT - CALL|CALLOUT|SEQ|tcp_id|id|unit|value|droptime|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|
  //sim_serial_no|simbank_name|isSip|join_app_type|error|area_name|과금방식|isSIP 0- 심 발신 / 1 - sip로 발신

  var command_line = dictdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var sim_imsi = command_line['data3'];
  var tcp_id = command_line['data4'];
  var user_id = command_line['data5'];
  var outbound = command_line['data6'];



  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.

  var isSip = 0;
  // 유저 체크
  try {
    var user_check = 'user_id = "' + user_id + '" AND user_sim_imsi = "' + sim_imsi + '"';
    var user_sim_check = 'user_id = "' + user_id + '" AND imsi = "' + sim_imsi + '" AND expire_match_date > ' + now;

    let user_checker = realm.objects('USER').filtered(user_check);
    let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);




    var check_outbound = filterInt(outbound)
    if (check_outbound != NaN) { // is number
      // console.log("check_outbound 2 : "+check_outbound)
      var outbound_n = is_local_check(check_outbound)
      if (outbound_n != 0) { // is local


        // var out_sim_area_no = area_no_check(outbound_n)

        var rate_check = 'area_no = ' + global_value.country_code + '';
        var rate_checker = realm.objects('RATE').filtered(rate_check);

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
          var user_credit = user_checker[0].credit;
          var call_value = rate_checker[0].call_value;
          var call_unit = rate_checker[0].call_unit;

          var available_time_s = global_value.call_drop_time(user_credit, call_unit, call_value);
          if (available_time_s != 0 ) { // 1분동안 통화를 가능할 크래딧일 경우

            var msg = "CALL|CALLOUT|" + seq + "|" + tcp_id + "|" + user_id + "|" + call_unit + "|" + call_value + "|" + available_time_s + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].kc + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisdn + "|" + user_sim_checker[0].send_sms_cnt + "|" + user_sim_checker[0].sim_id + "|" + user_sim_checker[0].sim_serial_no + "|" + user_sim_checker[0].simbank_name + "|" + isSip + "|" + user_checker[0].app_type + "|0|" + rate_checker[0].area_name + "|0|"

            process.send(msg);
            console.log(msg);
          }
          else {
            //사용가능한 크래딧이 없는 경우

            var msg = "CALL|CALLOUT|" + seq + "|" + tcp_id + "|" + user_id + "|" + call_unit + "|" + call_value + "|" + available_time_s + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].kc + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisdn + "|" + user_sim_checker[0].send_sms_cnt + "|" + user_sim_checker[0].sim_id + "|" + user_sim_checker[0].sim_serial_no + "|" + user_sim_checker[0].simbank_name + "|" + isSip + "|" + user_checker[0].app_type + "|101|" + rate_checker[0].area_name + "|0|"

            process.send(msg);
            console.log(msg);
          }


        }
        else { // 유저와심이 없을 경우
          //OUT - CALL|CALLOUT|SEQ|tcp_id|id|unit|value|droptime|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt_number|simbank_id|
          //sim_serial_no|simbank_name|isSip|join_app_type|error|area_name|과금방식|isSIP 0- 심 발신 / 1 - sip로 발신
          var rate_checker = area_no_check(outbound_n)
          var call_value = parseFloat(rate_checker[0].call_value.toFixed(3));

          var msg = "CALL|CALLOUT|" + seq + "|" + tcp_id + "|0|" +
            rate_checker.call_unit + "|" + call_value +
            "|0|0|0|0|0|0|" + 0 + "|0|" +
            "0|0|" + isSip + "|0|100|" + rate_checker.area_name + "|0|"
          process.send(msg);
          console.log(msg);
        }
      }
      else { // 로컬 번호가 아닌경우 is sip


        isSip = 1;
        var rate_checker = area_no_check(outbound)
        var call_value = parseFloat(rate_checker[0].call_value.toFixed(3));

        if (user_checker.length > 0) {
          var user_credit = user_checker[0].credit;
          var call_value = parseFloat(rate_checker[0].call_value.toFixed(3));
          var call_unit = rate_checker[0].call_unit;

          var available_time_s = global_value.call_drop_time(user_credit, call_unit, call_value);
          var msg = "CALL|CALLOUT|" + seq + "|" + tcp_id + "|" + user_id + "|" + rate_checker[0].call_unit + "|" + call_value + "|" + available_time_s + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].kc + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisdn + "|" + user_sim_checker[0].send_sms_cnt + "|" + user_sim_checker[0].sim_id + "|" + user_sim_checker[0].sim_serial_no + "|" + user_sim_checker[0].simbank_name + "|" + isSip + "|" + user_checker[0].app_type + "|0|" + rate_checker[0].area_name + "|0|"

          process.send(msg);
          console.log(msg);
        }
        else {
          var msg = "CALL|CALLOUT|" + seq + "|" + tcp_id + "|0|" +
            rate_checker[0].call_unit + "|" + call_value +
            "|0|0|0|0|0|0|" + 0 + "|0|" +
            "0|0|" + isSip + "|0|100|" + rate_checker[0].area_name + "|0|"

          process.send(msg);
          console.log(msg);
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
  var command = dictdata['command'];
  var sub_command = dictdata['data1'];
  var seq = dictdata['data2'];
  var sim_imsi = dictdata['data3'];

  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.



  var user_check = 'user_sim_imsi = "' + sim_imsi + '"';
  var user_sim_check = 'imsi = "' + sim_imsi + '" AND expire_match_date > ' + now;
  let user_checker = realm.objects('USER').filtered(user_check);
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  var error = 0;
  if (user_sim_checker.length > 0 && user_checker.length > 0) {
    error = 0;
    var available_time_s = global_value.call_drop_time(user_checker[0].credit, global_value.call_unit, global_value.call_value);
    var msg = command + "|" + sub_command + "|" + seq + "|" + user_checker[0].user_serial + "|" + user_checker[0].user_id + "|" + global_value.call_unit + "|" + global_value.call_value + "|" + available_time_s + "|" + error + "|" + user_checker[0].fcm_push_key + "|" + user_checker[0].voip_push_key + "|" + user_checker[0].join_type + "|" + user_checker[0].app_type + "|";
    console.log(msg)
    process.send(msg);
  }
  else {
    error = 100;
    var msg = command + "|" + sub_command + "|" + seq + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + error + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|";
    console.log(msg)
    process.send(msg);
  }
}

function call_drop(dictdata) {
  //IN - CALL|CALLDROP|SEQ|TYPE|s_date|c_date|e_date|unit|value|area_name|과금방식|join_app_type|con_id|
  //TYPE-CALLOUT/CALLIN, s_date-전화시작 시간, c_date-연결한시간, e_date-종료시간
  // OUT - ""


  var command_line = dictdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var seq = command_line['data2'];
  var sim_imsi = command_line['data3'];
  var TYPE = command_line['data4'];
  var s_date = parseInt(command_line['data5']);
  var c_date = parseInt(command_line['data6']);
  var e_date = parseInt(command_line['data7']);
  var unit = parseInt(command_line['data8']);
  var value = parseFloat(command_line['data9']);
  var area_name = command_line['data10'];
  var charging_method = command_line['data11'];
  var outbound = command_line['data12'];
  var con_id = command_line['data13'];




  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.
  var user_sim_check = 'imsi = "' + sim_imsi + '" AND expire_match_date > ' + now;
  var user_check = 'user_sim_imsi = "' + sim_imsi + '"';


  let user_checker = realm.objects('USER').filtered(user_check);
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  var content = 'CALL'
  var type = 0;

  // console.log(realm.objects('USER'))
  // console.log(realm.objects('SIM'))
  // console.log(now)

  if (user_checker.length > 0 && user_sim_checker.length > 0) { //유저와 심이 있을경우
    var description = outbound + " / " + user_sim_checker[0].msisdn;

    if (c_date != '0') { //전화 연결이 된경우
      var call_time = 0
      call_time = e_date - c_date;
      var deducted_credit = global_value.deducted_credit(call_time, unit, value);

      var credit_flag = 104;
      var call_result = "SUCCESS";


      //크래딧  차감, 심과 사용자 매칭, tb_credit_history입력
      realm.write(() => {
        user_checker[0].credit = user_checker[0].credit - deducted_credit; //크래딧 차감
      });
      var call_drop_msg = "DB|D07|" + user_checker[0].user_pid + "|" + user_checker[0].user_serial + "|" + user_checker[0].user_id + "|" + user_checker[0].credit + "|" +
        user_sim_checker[0].imsi + "|" + outbound + "|" + user_sim_checker[0].simbank_name + "|" + user_sim_checker[0].sim_serial_no + "|" + description + "|" +
        deducted_credit + "|" + credit_flag + "|" + area_name + "|" + content + "|" + type + "|" + TYPE + "|" + s_date + "|" + c_date + "|" + e_date + "|" + con_id + "|" + call_result + "|"


      console.log(call_drop_msg);
      addon_child.send_data(call_drop_msg);


    }
    else { //전화 연결이 안된경우
      console.log("is not connected")

      var credit_flag = 104;
      var call_result = "ERR-CON";
      var deducted_credit = 0

      // var call_drop_msg = "DB|D07|" + user_checker[0].user_serial + "|" + user_sim_checker[0].imsi + "|" + description + "|" + s_date + "|" + c_date + "|" + e_date + "|" + 0 + "|" + area_name + "|" + TYPE + "|" + con_id + "|ERR-CON|";
      var call_drop_msg = "DB|D07|" + user_checker[0].user_pid + "|" + user_checker[0].user_serial + "|" + user_checker[0].user_id + "|" + user_checker[0].credit + "|" +
        user_sim_checker[0].imsi + "|" + outbound + "|" + user_sim_checker[0].simbank_name + "|" + user_sim_checker[0].sim_serial_no + "|" + description + "|" +
        deducted_credit + "|" + credit_flag + "|" + area_name + "|" + content + "|" + type + "|" + TYPE + "|" + s_date + "|" + c_date + "|" + e_date + "|" + con_id + "|" + call_result + "|"

      console.log(call_drop_msg);
      addon_child.send_data(call_drop_msg);
      //call log 쌓기
    }

  }
  else { //유저와 심이 없을 경우
    console.log("is not user or sim")

    if (user_sim_checker.length > 0 && c_date != '0') { // 유저가 있을경우

      var call_time = e_date - c_date;
      var deducted_credit = global_value.deducted_credit(call_time, unit, value);

      var credit_flag = 104;
      var call_result = "SUCCESS";


      realm.write(() => {
        user_checker[0].credit = user_checker[0].credit - deducted_credit; //크래딧 차감
      });



      var call_drop_msg = "DB|D07|" + user_checker[0].user_pid + "|" + user_checker[0].user_serial + "|" + user_checker[0].user_id + "|" + user_checker[0].credit + "|" +
        0 + "|" + outbound + "|" + 0 + "|" + 0 + "|" + description + "|" +
        deducted_credit + "|" + credit_flag + "|" + area_name + "|" + content + "|" + type + "|" + TYPE + "|" + s_date + "|" + c_date + "|" + e_date + "|" + con_id + "|" + call_result + "|"

      // var call_drop_msg = "DB|D07|" + 0 + "|" + 0 + "|" + 0 + "|" + s_date + "|" + c_date + "|" + e_date + "|" + 0 + "|" + area_name + "|" + TYPE + "|" + con_id + "|ERR-USER|";
    }
    else {
      console.log("[CALL_DROP] is not user")

      var credit_flag = 104;
      var call_result = "ERROR-USER";


      var call_drop_msg = "DB|D07|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" +
        0 + "|" + outbound + "|" + 0 + "|" + 0 + "|" + description + "|" +
        0 + "|" + credit_flag + "|" + area_name + "|" + content + "|" + type + "|" + TYPE + "|" + s_date + "|" + c_date + "|" + e_date + "|" + con_id + "|" + call_result + "|"

    }


    console.log(call_drop_msg);
    addon_child.send_data(call_drop_msg);
    //call log 쌓기
  }
}
