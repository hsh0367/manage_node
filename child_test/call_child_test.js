console.log("[CALL] ON")
var Realm = require('realm');
const chema = require('../global.js')
const global_value = require('../global_value.js')
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");

var realm = new Realm({
  deleteRealmIfMigrationNeeded: true,
  disableFormatUpgrade: true,
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST, chema.GLOBALCARRIER_TEST],
  schemaVersion: 35
});

require('date-utils');
var fs = require('fs');
var options = {
  encoding: 'utf8',
  flag: 'a'
};
// realm.addListener("change", (realm, changes, schema) => {
//   write_log("realm.change : " + changes)
//
//   if (realm.isInTransaction) {
//     write_log("realm.change isInTransaction")
//     realm.commitTransaction();
//   }
// });

function write_log(data) {
  var dt = new Date();

  var d = dt.toFormat('YYYY-MM-DD HH24:MI:SS');
  var dd = dt.toFormat('YYYY-MM-DD');
  fs.writeFile('./log/child/call_child_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}
process.on('message', (value) => {
  console.log("call is on");
  command_classifier(value.data);
});

function command_classifier(data) {
  switch (data['data1']) {
    case 'CALLOUT':
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
  //1 is local
  //2 is sip
  // 0 is not number

  var number = '' + outbound;
  var outbound_1 = number.slice(0, 1)
  console.log("is local : " + number);
  write_log("is local : " + number)
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

      var country_code = '' + global_carrier_checker[0].country_code
      var code_length = country_code.length
      console.log("dddd" + code_length)
      var outbound_code = number.slice(0, code_length);
      console.log("xxxx" + outbound_code)

      if (outbound_code == country_code) { //is local
        console.log("is local " + number)

        return number
      }
      else {
        console.log("is not local " + number)

        return 0
      }
    }
    else {
      return 0

    }
  }
}
// function is_local_check(outbound) {
//   //1 is local
//   //2 is sip
//   // 0 is not number
//
//   var number = '' + outbound;
//   var outbound_1 = number.slice(0, 1)
//   console.log("is local : " + number);
//   write_log("is local : " + number)
//   if (outbound_1 == '0') {
//     // is local
//     var country_number = global_value.country_code;
//
//     return country_number + number.slice(1, -1)
//
//   }
//   else {
//     country = number.slice(0, 2)
//     console.log(country)
//
//     if (global_value.country_code == parseInt(country)) {
//       // is local
//       return outbound;
//     }
//     else {
//       // is sip
//       return 0
//     }
//   }
// }

function filterInt(value) {
  // ^(\+)?([0-9]*)$
  if (/^(\+)?([0-9]+|Infinity)$/.test(value))
    return value;
  return NaN;
}


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

function call_out_send_msg(available_time_s, call_out_data, sim_data) {


  if (available_time_s != 0) { // 1분동안 통화를 가능할 크래딧일 경우

    var msg = "CALL|CALLOUT|" + call_out_data.seq + "|" + call_out_data.tcp_id + "|" + call_out_data.user_id + "|" + call_out_data.callout_unit + "|" + call_out_data.callout_value + "|" + available_time_s + "|" + sim_data.imei + "|" + sim_data.tmsi + "|" + sim_data.kc + "|" + sim_data.cksn + "|" + sim_data.msisdn + "|" + sim_data.send_sms_cnt + "|" + sim_data.sim_id + "|" + sim_data.sim_serial_no + "|" + sim_data.simbank_name + "|" + call_out_data.isSip + "|" + 0 + "|0|" + call_out_data.area_name + "|0|" + sim_data.mp_ip + "|" + sim_data.mp_port + "|"
    console.log(msg);
    write_log("call_out : " + msg)
    process.send({
      data: msg,
      port: call_out_data.port
    });
  }
  else {
    //사용가능한 크래딧이 없는 경우

    var msg = "CALL|CALLOUT|" + call_out_data.seq + "|" + call_out_data.tcp_id + "|" + call_out_data.user_id + "|" + call_out_data.callout_unit + "|" + call_out_data.callout_value + "|" + available_time_s + "|" + sim_data.imei + "|" + sim_data.tmsi + "|" + sim_data.kc + "|" + sim_data.cksn + "|" + sim_data.msisdn + "|" + sim_data.send_sms_cnt + "|" + sim_data.sim_id + "|" + sim_data.sim_serial_no + "|" + sim_data.simbank_name + "|" + call_out_data.isSip + "|" + 0 + "|101|" + call_out_data.area_name + "|0|" + sim_data.mp_ip + "|" + sim_data.mp_port + "|"
    write_log("call_out_send_msg  크래딧 부족 :  " + msg)

    process.send({
      data: msg,
      port: call_out_data.port
    });
    console.log(msg);
  }
}

function call_out_send_msg_simx(available_time_s, call_out_data, sim_data) {
  if (available_time_s != 0) { // 1분동안 통화를 가능할 크래딧일 경우
    //CALL|CALLOUT|SEQ|tcp_id|id|unit|value|droptime|imei|tmsi|kc|cksn|msisdn|reference_number|simbank_id|sim_serial_no|simbank_name|isSip|join_app_type|error|area_name|과금방식|MP_IP|MP_PORT|
    //과금방식 node에서 처리할 예정

    var msg = "CALL|CALLOUT|" + call_out_data.seq + "|" + call_out_data.tcp_id + "|" + call_out_data.user_id + "|" + call_out_data.callout_unit + "|" + call_out_data.callout_value + "|" + available_time_s + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + call_out_data.isSip + "|" + 0 + "|0|" + call_out_data.area_name + "|0|" + sim_data.mp_ip + "|" + sim_data.mp_port + "|"
    console.log(msg);
    write_log("call_out is sip: " + msg)
    process.send({
      data: msg,
      port: call_out_data.port
    });
  }
  else {

    var msg = "CALL|CALLOUT|" + call_out_data.seq + "|" + call_out_data.tcp_id + "|" + call_out_data.user_id + "|" + call_out_data.callout_unit + "|" + call_out_data.callout_value + "|" + available_time_s + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + call_out_data.isSip + "|" + 0 + "|101|" + call_out_data.area_name + "|0|" + sim_data.mp_ip + "|" + sim_data.mp_port + "|"
    write_log("call_out  크래딧 부족 : " + msg)

    process.send({
      data: msg,
      port: call_out_data.port
    });
    console.log(msg);
  }
}

function call_out_send_msg_allx(available_time_s, call_out_data, sim_data) {
  var msg = "CALL|CALLOUT|" + call_out_data.seq + "|" + call_out_data.tcp_id + "|0|" + call_out_data.callout_unit + "|" + call_out_data.callout_value + "|0|0|0|0|0|0|" + 0 + "|0|0|0|" + call_out_data.isSip + "|0|100|" + call_out_data.area_name + "|0|" + sim_data.mp_ip + "|" + sim_data.mp_port + "|"
  console.log(msg);
  write_log("call_out is sip: " + msg)
  process.send({
    data: msg,
    port: call_out_data.port
  });
}

function tt_call_out(call_out_data, user_checker) {
  var sim_data = new Object();
  var user_sim_check = 'user_id = "' + call_out_data.user_id + '" AND imsi = "' + call_out_data.sim_imsi + '"'
  var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  var check_outbound = filterInt(call_out_data.outbound)
  sim_data.mp_ip = 0
  sim_data.mp_port = 0
  call_out_data.isSip = 0

  if (check_outbound != NaN) { // is number
    var outbound_n = is_local_check(check_outbound, call_out_data.sim_imsi)
    if (outbound_n != 0) { // is local

      if (user_checker.length > 0 && user_sim_checker.length > 0) { // 유저가 존재하고 심이 있을경우
        sim_data.imei = user_sim_checker[0].imei
        sim_data.tmsi = user_sim_checker[0].tmsi
        sim_data.kc = user_sim_checker[0].kc
        sim_data.cksn = user_sim_checker[0].cksn
        sim_data.msisdn = user_sim_checker[0].msisdn
        sim_data.send_sms_cnt = user_sim_checker[0].send_sms_cnt
        sim_data.sim_id = user_sim_checker[0].sim_id
        sim_data.sim_serial_no = user_sim_checker[0].sim_serial_no
        sim_data.simbank_name = user_sim_checker[0].simbank_name
        sim_data.mcc = user_sim_checker[0].mcc
        sim_data.mnc = user_sim_checker[0].mnc
        sim_data.user_credit = user_checker[0].credit
        sim_data.app_type = user_checker[0].app_type

        var global_carrier_check = 'mcc = "' + sim_data.mcc + '"AND mnc = "' + sim_data.mnc + '"';
        let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
        sim_data.mp_ip = global_carrier_checker[0].mp_ip
        sim_data.mp_port = global_carrier_checker[0].mp_port

        sms_cnt_check(sim_data.send_sms_cnt, user_sim_checker)
        call_out_data.callout_unit = 0
        call_out_data.callout_value = 0
        call_out_data.area_name = global_carrier_checker[0].carrier


        // var available_time_s = global_value.call_drop_time(sim_data.user_credit, call_out_data.callout_unit, call_out_data.callout_value);
        var available_time_s = 3600
        call_out_send_msg(available_time_s, call_out_data, sim_data)
      }
    }
    else { // 로컬 번호가 아닌경우 is sip or user, sim 정보 없을 경우
      call_out_data.isSip = 1;

      var rate_checker = area_no_check(call_out_data.outbound)
      call_out_data.callout_value = parseFloat(rate_checker[0].call_value.toFixed(3));
      call_out_data.callout_unit = rate_checker[0].call_unit
      call_out_data.area_name = rate_checker[0].area_name

      if (user_checker.length > 0 && user_sim_checker.length > 0) {

        sim_data.imei = user_sim_checker[0].imei
        sim_data.tmsi = user_sim_checker[0].tmsi
        sim_data.kc = user_sim_checker[0].kc
        sim_data.cksn = user_sim_checker[0].cksn
        sim_data.msisdn = user_sim_checker[0].msisdn
        sim_data.send_sms_cnt = user_sim_checker[0].send_sms_cnt
        sim_data.sim_id = user_sim_checker[0].sim_id
        sim_data.sim_serial_no = user_sim_checker[0].sim_serial_no
        sim_data.simbank_name = user_sim_checker[0].simbank_name
        sim_data.app_type = user_checker[0].app_type
        sim_data.user_credit = user_checker[0].credit
        sim_data.app_type = user_checker[0].app_type

        sms_cnt_check(sim_data.send_sms_cnt, user_sim_checker)
        var carrier_id = call_out_data.sim_imsi.slice(0, 5)

        var available_time_s = global_value.call_drop_time(sim_data.user_credit, call_out_data.callout_unit, call_out_data.callout_value);

        var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
        let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);

        sim_data.mp_ip = global_carrier_checker[0].mp_ip
        sim_data.mp_port = global_carrier_checker[0].mp_port

        call_out_send_msg(available_time_s, call_out_data, sim_data)


      }
      else if (user_checker.length > 0 && user_sim_checker.length == 0) {
        var carrier_id = call_out_data.sim_imsi.slice(0, 5)
        var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
        let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);



        sim_data.mp_ip = global_carrier_checker[0].mp_ip
        sim_data.mp_port = global_carrier_checker[0].mp_port


        sim_data.app_type = user_checker[0].app_type
        sim_data.user_credit = user_checker[0].credit

        var available_time_s = global_value.call_drop_time(sim_data.user_credit, call_out_data.call_unit, call_out_data.call_value);
        call_out_send_msg_simx(available_time_s, call_out_data, sim_data)
      }
    }
  }
  else {
    //ERR is outbound not found
    write_log("ERR is outbound not found")
    console.log("ERR is outbound not found");

  }
}

function call_out(dictdata) {
  //IN - CALL|CALLOUT|SEQ|sim_imsi|tcp_id|id|outbound|
  //OUT - CALL|CALLOUT|SEQ|tcp_id|id|unit|value|droptime|imei|tmsi|kc|cksn|msisdn|user_sim_checker[0].send_sms_cnt|simbank_id|
  //sim_serial_no|simbank_name|isSip|join_app_type|error|area_name|과금방식|isSIP 0- 심 발신 / 1 - sip로 발신
  var sim_data = new Object();


  var command_line = dictdata;
  var call_out_data = new Object();
  call_out_data.command = command_line['command']
  call_out_data.sub_command = command_line['data1']
  call_out_data.seq = command_line['data2']
  call_out_data.sim_imsi = command_line['data3']
  call_out_data.tcp_id = command_line['data4']
  call_out_data.user_id = command_line['data5']
  call_out_data.outbound = command_line['data6']
  call_out_data.port = command_line['port']

  sim_data.mp_ip = 0
  sim_data.mp_port = 0
  call_out_data.isSip = 0


  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.

  // 유저 체크
  try {
    var user_check = 'user_id = "' + call_out_data.user_id + '" AND user_sim_imsi = "' + call_out_data.sim_imsi + '"';
    var user_sim_check = 'user_id = "' + call_out_data.user_id + '" AND imsi = "' + call_out_data.sim_imsi + '" AND expire_match_date > ' + now;


    // var user_sim_check = 'user_id = "' + call_out_data.user_id + '" AND imsi = "' + call_out_data.sim_imsi + '"';
    var user_checker = realm.objects('USER').filtered(user_check);
    var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);


    if (user_checker.length > 0) {
      sim_data.sim_type = user_checker[0].join_type

      if (sim_data.sim_type == 1) {
        tt_call_out(call_out_data, user_checker)
      }
      else {


        var check_outbound = filterInt(call_out_data.outbound)
        if (check_outbound != NaN) { // is number
          var outbound_n = is_local_check(check_outbound, call_out_data.sim_imsi)
          if (outbound_n != 0) { // is local

            if (user_checker.length > 0 && user_sim_checker.length > 0) { // 유저가 존재하고 심이 있을경우
              sim_data.imei = user_sim_checker[0].imei
              sim_data.tmsi = user_sim_checker[0].tmsi
              sim_data.kc = user_sim_checker[0].kc
              sim_data.cksn = user_sim_checker[0].cksn
              sim_data.msisdn = user_sim_checker[0].msisdn
              sim_data.send_sms_cnt = user_sim_checker[0].send_sms_cnt
              sim_data.sim_id = user_sim_checker[0].sim_id
              sim_data.sim_serial_no = user_sim_checker[0].sim_serial_no
              sim_data.simbank_name = user_sim_checker[0].simbank_name
              sim_data.mcc = user_sim_checker[0].mcc
              sim_data.mnc = user_sim_checker[0].mnc
              sim_data.user_credit = user_checker[0].credit
              sim_data.app_type = user_checker[0].app_type

              sms_cnt_check(sim_data.send_sms_cnt, user_sim_checker)
              var carrier_id = call_out_data.sim_imsi.slice(0, 5)
              var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
              let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
              sim_data.mp_ip = global_carrier_checker[0].mp_ip
              sim_data.mp_port = global_carrier_checker[0].mp_port

              call_out_data.callout_unit = global_carrier_checker[0].callout_unit
              call_out_data.callout_value = global_carrier_checker[0].callout_value
              call_out_data.area_name = global_carrier_checker[0].carrier


              var available_time_s = global_value.call_drop_time(sim_data.user_credit, call_out_data.callout_unit, call_out_data.callout_value);
              call_out_send_msg(available_time_s, call_out_data, sim_data)
            }
          }
          else { // 로컬 번호가 아닌경우 is sip or user, sim 정보 없을 경우
            call_out_data.isSip = 1;

            var rate_checker = area_no_check(call_out_data.outbound)
            call_out_data.callout_value = parseFloat(rate_checker[0].call_value.toFixed(3));
            call_out_data.callout_unit = rate_checker[0].call_unit
            call_out_data.area_name = rate_checker[0].area_name

            if (user_checker.length > 0 && user_sim_checker.length > 0) {

              sim_data.imei = user_sim_checker[0].imei
              sim_data.tmsi = user_sim_checker[0].tmsi
              sim_data.kc = user_sim_checker[0].kc
              sim_data.cksn = user_sim_checker[0].cksn
              sim_data.msisdn = user_sim_checker[0].msisdn
              sim_data.send_sms_cnt = user_sim_checker[0].send_sms_cnt
              sim_data.sim_id = user_sim_checker[0].sim_id
              sim_data.sim_serial_no = user_sim_checker[0].sim_serial_no
              sim_data.simbank_name = user_sim_checker[0].simbank_name
              sim_data.app_type = user_checker[0].app_type
              sim_data.user_credit = user_checker[0].credit
              sim_data.app_type = user_checker[0].app_type

              var available_time_s = global_value.call_drop_time(sim_data.user_credit, call_out_data.callout_unit, call_out_data.callout_value);
              sms_cnt_check(sim_data.send_sms_cnt, user_sim_checker)
              call_out_send_msg(available_time_s, call_out_data, sim_data)

            }
            else if (user_checker.length > 0 && user_sim_checker.length == 0) {
              var carrier_id = call_out_data.sim_imsi.slice(0, 5)
              var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
              let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
              sim_data.mp_ip = global_carrier_checker[0].mp_ip
              sim_data.mp_port = global_carrier_checker[0].mp_port

              sim_data.app_type = user_checker[0].app_type
              sim_data.user_credit = user_checker[0].credit

              var available_time_s = global_value.call_drop_time(sim_data.user_credit, call_out_data.call_unit, call_out_data.call_value);
              call_out_send_msg_simx(available_time_s, call_out_data, sim_data)
            }
          }
        }
        else {
          //ERR is outbound not found
          write_log("ERR is outbound not found")
          console.log("ERR is outbound not found");
        }
      }

    }
    else {
      var carrier_id = call_out_data.sim_imsi.slice(0, 5)
      var global_carrier_check = 'carrier_id = "' + carrier_id + '"';
      let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);
      sim_data.mp_ip = global_carrier_checker[0].mp_ip
      sim_data.mp_port = global_carrier_checker[0].mp_port

      call_out_send_msg_allx(available_time_s, call_out_data, sim_data)
    }
  }
  catch (e) {
    console.log(e);
    write_log(e)
  }
}

function call_in_msg(call_in_data, sim_data) {

  var msg = call_in_data.command + "|" + call_in_data.sub_command + "|" + call_in_data.seq + "|" + sim_data.user_serial + "|" + sim_data.user_id + "|" + sim_data.callin_unit + "|" + sim_data.callin_value + "|" + call_in_data.available_time_s + "|" + call_in_data.error + "|" + sim_data.fcm_push_key + "|" + sim_data.voip_push_key + "|" + 0 + "|" + sim_data.app_type + "|";
  console.log(msg)
  write_log("call_in : " + msg)

  process.send({
    data: msg,
    port: call_in_data.port
  });

}

function call_in(dictdata) {
  //IN - CALL|CALLIN|SEQ|sim_imsi|
  //OUT - CALL|CALLIN|SEQ|tcp_id|id|unit|value|droptime|push_key|voip_key|join_app_type|os_type|os_type 0안드로이드/ 1-ios
  var call_in_data = new Object();
  var sim_data = new Object();

  call_in_data.command = dictdata['command'];
  call_in_data.sub_command = dictdata['data1'];
  call_in_data.seq = dictdata['data2'];
  call_in_data.sim_imsi = dictdata['data3'];
  call_in_data.port = dictdata['port'];

  sim_data.credit = 0;
  sim_data.user_serial = "0";
  sim_data.user_id = "0";
  sim_data.fcm_push_key = "0";
  sim_data.voip_push_key = "0";
  sim_data.join_type = 0;
  sim_data.app_type = 0;

  sim_data.mcc = "0";
  sim_data.mnc = "0";


  call_in_data.error = 0;
  sim_data.callin_unit = 0;
  sim_data.callin_value = 0;
  call_in_data.available_time_s = 0;




  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.


  var user_sim_check = 'imsi = "' + call_in_data.sim_imsi + '"';
  var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);
  sim_data.user_id = user_sim_checker[0].user_id;
  var user_check = 'user_id = "' + sim_data.user_id + '" AND user_sim_imsi = "' + call_in_data.sim_imsi + '"';
  var user_checker = realm.objects('USER').filtered(user_check);

  console.log("111111111")
  if (user_sim_checker.length > 0 && user_checker.length > 0) {
    console.log("22222222")

    sim_data.credit = user_checker[0].credit;
    sim_data.user_serial = user_checker[0].user_serial;
    sim_data.user_id = user_checker[0].user_id;
    sim_data.fcm_push_key = user_checker[0].fcm_push_key;
    sim_data.voip_push_key = user_checker[0].voip_push_key;
    sim_data.join_type = user_checker[0].join_type;
    sim_data.app_type = user_checker[0].app_type;

    sim_data.mcc = user_sim_checker[0].mcc;
    sim_data.mnc = user_sim_checker[0].mnc;


    var global_carrier_check = 'mcc = "' + sim_data.mcc + '"AND mnc = "' + sim_data.mnc + '"';
    let global_carrier_checker = realm.objects('GLOBALCARRIER').filtered(global_carrier_check);

    sim_data.callin_unit = global_carrier_checker[0].callin_unit;
    sim_data.callin_value = global_carrier_checker[0].callin_value.toFixed(3);

    if (user_sim_checker[0].sim_type == 0) {
      console.log("333333")

      call_in_data.available_time_s = global_value.call_drop_time(sim_data.credit, sim_data.callin_unit, sim_data.callin_value);
    }
    else if (user_sim_checker[0].sim_type == 1) {
      console.log("444444")

      call_in_data.available_time_s = 3600
    }
    // var msg = call_in_data.command + "|" + call_in_data.sub_command + "|" + call_in_data.seq + "|" + sim_data.user_serial + "|" + sim_data.user_id + "|" + sim_data.callin_unit + "|" + sim_data.callin_value + "|" + available_time_s + "|" + error + "|" + sim_data.fcm_push_key + "|" + sim_data.voip_push_key + "|" + sim_data.join_type + "|" + sim_data.app_type + "|";
    // console.log(msg)
    // write_log("call_in : " + msg)
    //
    // process.send({
    //   data: msg,
    //   port: call_in_data.port
    // });
    console.log("555555")

    call_in_msg(call_in_data, sim_data)
  }
  else {
    console.log("666666")

    // var msg = call_in_data.command + "|" + call_in_data.sub_command + "|" + call_in_data.seq + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + error + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|";
    // console.log(msg)
    // write_log("call_in is not user or sim: " + msg)
    //
    // process.send({
    //   data: msg,
    //   port: call_in_data.port
    // });
    call_in_data.error = 100;
    call_in_msg(call_in_data, sim_data)
  }
}

function call_drop_msg(call_drop_data, sim_data) {
  var call_drop_msg = "DB|D07|" + sim_data.user_pid + "|" + sim_data.user_serial + "|" + sim_data.user_id + "|" + sim_data.credit + "|" + sim_data.imsi + "|" + call_drop_data.outbound + "|" + sim_data.simbank_name + "|" + sim_data.sim_serial_no + "|" + call_drop_data.description + "|" +
    call_drop_data.deducted_credit + "|" + call_drop_data.credit_flag + "|" + call_drop_data.area_name + "|" + call_drop_data.content + "|" + call_drop_data.type + "|" + call_drop_data.TYPE + "|" + call_drop_data.s_date + "|" + call_drop_data.c_date + "|" + call_drop_data.e_date + "|" + call_drop_data.con_id + "|" + call_drop_data.call_result + "|"
  console.log(call_drop_msg);
  write_log("call_drop SUCCESS : " + call_drop_msg)

  addon_child.send_data(call_drop_msg);
}

function tt_call_drop(call_drop_data, user_checker) {
  var sim_data = new Object();


  call_drop_data.call_time = 0
  call_drop_data.deducted_credit = 0
  call_drop_data.credit_flag = 0;
  call_drop_data.call_result = "0";
  call_drop_data.description = "0";
  call_drop_data.call_time = 0
  call_drop_data.deducted_credit = 0
  call_drop_data.credit_flag = 0;
  call_drop_data.call_result = "0";

  sim_data.credit = 0
  sim_data.user_pid = 0
  sim_data.user_serial = 0
  sim_data.user_id = 0
  sim_data.imsi = 0
  sim_data.simbank_name = 0
  sim_data.sim_serial_no = 0


  call_drop_data.content = 'CALL'
  call_drop_data.type = 0;
  call_drop_data.description = "0"

  var user_sim_check = 'imsi = "' + call_drop_data.sim_imsi + '" AND user_id = "' + user_checker[0].user_id + '"'

  var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);


  if (user_checker.length > 0 && user_sim_checker.length > 0) { //유저와 심이 있을경우
    call_drop_data.description = call_drop_data.outbound + " / " + user_sim_checker[0].msisdn;
    sim_data.credit = user_checker[0].credit
    sim_data.user_pid = user_checker[0].user_pid
    sim_data.user_serial = user_checker[0].user_serial
    sim_data.user_id = user_checker[0].user_id

    sim_data.imsi = user_sim_checker[0].imsi
    sim_data.simbank_name = user_sim_checker[0].simbank_name
    sim_data.sim_serial_no = user_sim_checker[0].sim_serial_no


    if (call_drop_data.c_date != 0) { //전화 연결이 된경우

      call_drop_data.call_time = 0
      call_drop_data.call_time = call_drop_data.e_date - call_drop_data.c_date;
      call_drop_data.deducted_credit = global_value.deducted_credit(call_drop_data.call_time, call_drop_data.unit, call_drop_data.value);

      call_drop_data.credit_flag = 104;
      call_drop_data.call_result = "SUCCESS";


      //크래딧  차감, 심과 사용자 매칭, tb_credit_history입력
      sim_data.credit = sim_data.credit - call_drop_data.deducted_credit;
      realm.write(() => {
        user_checker[0].credit = sim_data.credit; //크래딧 차감
      });

      call_drop_msg(call_drop_data, sim_data)

    }
    else { //전화 연결이 안된경우
      console.log("is not connected")
      var credit_flag = 104;
      var call_result = "ERR-CON";
      var deducted_credit = 0
      call_drop_msg(call_drop_data, sim_data)
    }
  }
  else { //유저와 심이 없을 경우
    console.log("[CALL_DROP] ttgo is not user")
    write_log("[CALL_DROP] ttgo is not user")

    if (user_sim_checker.length > 0 && call_drop_data.c_date != 0) { // 유저가 있을경우

      call_drop_data.call_time = e_date - c_date;
      call_drop_data.deducted_credit = global_value.deducted_credit(call_drop_data.call_time, call_drop_data.unit, call_drop_data.value);
      call_drop_data.credit_flag = 104;
      call_drop_data.call_result = "SUCCESS";

      sim_data.credit = user_checker[0].credit
      sim_data.user_pid = user_checker[0].user_pid
      sim_data.user_serial = user_checker[0].user_serial
      sim_data.user_id = user_checker[0].user_id

      call_drop_data.credit = call_drop_data.credit - call_drop_data.deducted_credit
      realm.write(() => {
        user_checker[0].credit = credit; //크래딧 차감
      });


      call_drop_msg(call_drop_data, sim_data)

    }
    else {
      console.log("tt_call_drop")
      console.log("[CALL_DROP] is not user")

      call_drop_data.redit_flag = 104;
      call_drop_data.call_result = "ERROR-USER";
      call_drop_msg(call_drop_data, sim_data)

    }
  }
}

function call_drop(dictdata) {
  //IN - CALL|CALLDROP|SEQ|TYPE|s_date|c_date|e_date|unit|value|area_name|과금방식|join_app_type|con_id|
  //TYPE-CALLOUT/CALLIN, s_date-전화시작 시간, c_date-연결한시간, e_date-종료시간
  // OUT - ""
  var sim_data = new Object();
  var call_drop_data = new Object();
  var command_line = dictdata;

  call_drop_data.command = command_line['command'];
  call_drop_data.sub_command = command_line['data1'];
  call_drop_data.seq = command_line['data2'];
  call_drop_data.sim_imsi = command_line['data3'];
  call_drop_data.TYPE = command_line['data4'];
  call_drop_data.s_date = parseInt(command_line['data5']);
  call_drop_data.c_date = parseInt(command_line['data6']);
  call_drop_data.e_date = parseInt(command_line['data7']);
  call_drop_data.unit = parseInt(command_line['data8']);
  call_drop_data.value = parseFloat(command_line['data9']);
  call_drop_data.area_name = command_line['data10'];
  call_drop_data.charging_method = command_line['data11'];
  call_drop_data.outbound = command_line['data12'];
  call_drop_data.con_id = command_line['data13'];
  call_drop_data.port = command_line['port'];





  // call_drop_data.content = '0'
  // call_drop_data.type = 0;
  // call_drop_data.description = "0"
  call_drop_data.call_time = 0
  call_drop_data.call_time = 0
  call_drop_data.deducted_credit = 0
  call_drop_data.credit_flag = 0;
  call_drop_data.call_result = "0";
  call_drop_data.description = "0";
  call_drop_data.call_time = 0
  call_drop_data.deducted_credit = 0
  call_drop_data.credit_flag = 0;
  call_drop_data.call_result = "0";

  sim_data.credit = 0
  sim_data.user_pid = 0
  sim_data.user_serial = 0
  sim_data.user_id = 0
  sim_data.imsi = 0
  sim_data.simbank_name = 0
  sim_data.sim_serial_no = 0


  call_drop_data.content = 'CALL'
  call_drop_data.type = 0;
  call_drop_data.description = "0"


  var now = Date.now(); //바로 REALM에서 데이터를 쓰기때문에 /1000을해준다 다임컨버트를 해줄경우 상관이 없다.
  var user_check = 'user_sim_imsi = "' + call_drop_data.sim_imsi + '"';
  var user_sim_check = 'imsi = "' + call_drop_data.sim_imsi + '" AND expire_match_date > ' + now;

  var user_checker = realm.objects('USER').filtered(user_check);
  var user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  if (user_checker.length > 0) {
    sim_data.join_type = user_checker[0].join_type
    if (sim_data.join_type == 1) {
      console.log("tt_call_drop")
      tt_call_drop(call_drop_data, user_checker)
    }
    else {
      console.log("sim_data.join_type : " + sim_data.join_type)
      if (user_checker.length > 0 && user_sim_checker.length > 0) { //유저와 심이 있을경우


        call_drop_data.description = call_drop_data.outbound + " / " + user_sim_checker[0].msisdn;
        sim_data.credit = user_checker[0].credit
        sim_data.user_pid = user_checker[0].user_pid
        sim_data.user_serial = user_checker[0].user_serial
        sim_data.user_id = user_checker[0].user_id

        sim_data.imsi = user_sim_checker[0].imsi
        sim_data.simbank_name = user_sim_checker[0].simbank_name
        sim_data.sim_serial_no = user_sim_checker[0].sim_serial_no


        if (call_drop_data.c_date != 0 ) { //전화 연결이 된경우

          call_drop_data.call_time = 0
          call_drop_data.call_time = call_drop_data.e_date - call_drop_data.c_date;
          call_drop_data.deducted_credit = global_value.deducted_credit(call_drop_data.call_time, call_drop_data.unit, call_drop_data.value);

          call_drop_data.credit_flag = 104;
          call_drop_data.call_result = "SUCCESS";


          //크래딧  차감, 심과 사용자 매칭, tb_credit_history입력
          sim_data.credit = sim_data.credit - call_drop_data.deducted_credit;
          realm.write(() => {
            user_checker[0].credit = sim_data.credit; //크래딧 차감
          });

          call_drop_msg(call_drop_data, sim_data)

        }
        else { //전화 연결이 안된경우

          console.log("is not connected")
          var credit_flag = 104;
          var call_result = "ERR-CON";
          var deducted_credit = 0
          call_drop_msg(call_drop_data, sim_data)

        }

      }
      else { //유저와 심이 없을 경우
        console.log("is not user or sim")

        if (user_sim_checker.length > 0 && call_drop_data.c_date != 0) { // 유저가 있을경우

          call_drop_data.call_time = e_date - c_date;
          call_drop_data.deducted_credit = global_value.deducted_credit(call_drop_data.call_time, call_drop_data.unit, call_drop_data.value);
          call_drop_data.credit_flag = 104;
          call_drop_data.call_result = "SUCCESS";

          sim_data.credit = user_checker[0].credit
          sim_data.user_pid = user_checker[0].user_pid
          sim_data.user_serial = user_checker[0].user_serial
          sim_data.user_id = user_checker[0].user_id

          call_drop_data.credit = call_drop_data.credit - call_drop_data.deducted_credit
          realm.write(() => {
            user_checker[0].credit = credit; //크래딧 차감
          });


          call_drop_msg(call_drop_data, sim_data)

        }
        else {
          console.log("call_drop")

          console.log("[CALL_DROP] is not user")

          call_drop_data.redit_flag = 104;
          call_drop_data.call_result = "ERROR-USER";

          call_drop_msg(call_drop_data, sim_data)

        }
      }

    }
  }

}
