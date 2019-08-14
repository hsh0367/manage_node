"use strict";

var Realm = require('realm');
const chema = require('../global.js')
const global_value = require('../global_value.js')
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");

var hash_test = require('./realm_controller.js');
var sim_map = hash_test.sim_map;
var user_map = hash_test.user_map;
var carrier_map = hash_test.carrier_map;
var rate_map = hash_test.rate_map;

var Queue = require('bull');
var RealmQue = new Queue('RealmQue')

function bull_add_data(data) {
  RealmQue.add({
    data: data
  })
}


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
  fs.writeFile('./log/child/policy_child_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}


process.on('message', (value) => {
  console.log("mp is on");
  command_classifier(value.data);
});

//mp command_classifier
function command_classifier(data) {
  switch (data['data1']) {
    case 'PAGING':
      console.log("mp_paging ");
      mp_paging(data);
      break;
    case 'PORT_ARRANGE':
      console.log("PORT_ARRANGE");
      port_arrange(data);
      break;
    case 'BALANCE':
      callnsole.log("BALANCE ");
      sim_balance_check(data);
      break;
    case 'MSISDN':
      callnsole.log("MSISDN ");
      sim_msisdn_check(data);
      break;
    case 'CHARGE':
      callnsole.log("CHARGE");
      sim_charge(data);
      break;
    default:
      console.log("[CALL] not find sub command");
  }
}

//페이징 처리하는 함수
function mp_paging(dictdata) {

  // MP|PAGING|SEQ|sim_imsi|tmsi|channel|mi_type|arfcn|cell_id|bsic|
  // MP|PAGING|SEQ|sim_imsi|imei|tmsi|kc|cksn|msisdn|simbank_id|sim_serial_no|lac|channel|mi_type|arfcn|cell_id|bsic|
  // mi_type : 수신시 지정방법 imsi,tmsi
  // channel : 수신시 channel 정보


  var command = dictdata['command'];
  var sub_command = dictdata['data1'];
  var seq = dictdata['data2'];
  var sim_imsi = dictdata['data3'];
  var tmsi = dictdata['data4'];
  var channel = dictdata['data5'];
  var mi_type = dictdata['data6'];
  var arfcn = dictdata['data7'];
  var cell_id = dictdata['data8'];
  var bsic = dictdata['data9'];

  var now = Date.now();

  var sim_check = sim_map.get(sim_imsi)


  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);


  if (sim_check != "undefined") {
    var imsi = sim_check.imsi;
    var imei = sim_check.imei;
    var tmsi = sim_check.tmsi;
    var kc = sim_check.kc;
    var cksn = sim_check.cksn;
    var msisdn = sim_check.msisdn;
    var sim_id = sim_check.sim_id;
    var sim_serial_no = sim_check.sim_serial_no;
    var lac = sim_check.lac;
    var arfcn = sim_check.arfcn;
    var cell_id = sim_check.cell_id;
    var bsic = sim_check.bsic;

    var carrier_id = sim_imsi.slice(0, 5)
    var carrier_check = carrier_map.get(carrier_id);

    if (carrier_check != "undefined") {
      var mp_ip = carrier_check.mp_ip
      var mp_port = carrier_check.mp_port

      var msg = "MP|PAGING|" + seq + "|" + imsi + "|" + imei + "|" + tmsi + "|" + kc + "|" + cksn + "|" + msisdn + "|" + sim_id + "|" + sim_serial_no + "|" + lac + "|" + channel + "|" + mi_type + "|" + arfcn + "|" + cell_id + "|" + bsic + "|"
      process.send({
        data: msg,
        port: mp_port,
        ip: mp_ip
      });
    }


  }
  else {

    var carrier_id = sim_imsi.slice(0, 5)
    var carrier_id = sim_imsi.slice(0, 5)
    var carrier_check = carrier_map.get(carrier_id);

    if (global_carrier_checker.length > 0) {
      var mp_ip = carrier_check.mp_ip
      var mp_port = carrier_check.mp_port

      var msg = "MP|PAGING|" + seq + "|" + sim_imsi + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + channel + "|" + mi_type + "|" + 0 + "|" + 0 + "|" + 0 + "|"
      process.send({
        data: msg,
        port: mp_port,
        ip: mp_ip
      });
    }
  }


}

// 아직 당장 필요한 기능이 아니므로 port_arrange 뼈대만 만들어둠
function port_arrange(dictdata) {
  //IN - MP|PORT_ARRANGE|CON_ID|IMSI|OUTBOUND|CUR_TIME|CALLOUT|/CALLIN|SRART/ANSWER/DROP|
  //OUT - ""
  var command_line = dicdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var con_id = command_line['data2'];
  var imsi = command_line['data3'];
  var outbound = command_line['data4'];
  var cur_time = command_line['data5'];
  var call_out_in_check = command_line['data6'];
  var call_state = command_line['data7'];
}

//심잔액체크된 결과값을 받아 realm,MYSQL에 저장을 한다.
function sim_balance_check(dictdata) {
  //mysql 업데이트 해주어야 한다.
  // MP|BALANCE|conID|IMSI|result|balance|    result  : 1 성공 / 0 -실패 / -1  채널로스 실패
  //성공시 realm에 업데이트 해주어야 한다.
  var conID = dictdata['data2']
  var imsi = dictdata['data3']
  var result = dictdata['data4']
  var balance = parseInt(dictdata['data5']);
  var user_sim_check = 'imsi = "' + imsi + '"';
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);

  var sim_check = sim_map.get(imsi)

  if (result == 1) {

    if (sim_check != "undefined") {
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|sim_balance|INT|" + balance + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|etc_blance_flag|INT|" + 0 + "|")
      //mysql 업데이트 해주어야 한다.
      var dbmsg = "DB|ETC|BALANCE|" + imsi + "|" + sim_blance + "|";
      addon_child.send_data(dbmsg);
    }
    else {
      //imsi is not found
      console.log("MP sim_balance_check : is not found sim imsi " + imsi)
      write_log("MP sim_balance_check : is not found sim imsi " + imsi);
    }
  }
  else {
    //mysql 실패결과를 업데이트 해주어야 한다.
    var dbmsg = "DB|ETC|ERR|" + imsi + "|7|";
    addon_child.send_data(dbmsg);
  }

}
//value 값이 문자인지 숫자인지 판단하는 함수
function filterInt(value) {
  // ^(\+)?([0-9]*)$
  if (/^(\+)?([0-9]+|Infinity)$/.test(value))
    return value;
  return NaN;
}

//심 msisdn(전화번호) 채크를하여 msisdn(전화번호) 저장한다.
function sim_msisdn_check(dictdata) {
  //mysql 업데이트 해주어야 한다.
  // MP|MSISDN|conID|IMSI|result|MSISDN|    result  : 1 성공 / 0 -실패 / -1  채널로스 실패
  //성공시 realm에 업데이트 해주어야 한다.
  var conID = dictdata['data2']
  var imsi = dictdata['data3']
  var result = dictdata['data4']
  var msisdn = dictdata['data5']


  msisdn = filterInt(msisdn);
  var msisdn_length = msisdn.length;


  var sim_check = sim_map.get(imsi)

  var carrier_id = sim_check.mcc + sim_check.mnc;
  var carrier_check = carrier_map(carrier_id)

  if (msisdn != "0" && msisdn != NaN) {

    if (carrier_check != "undefined" && sim_check != "undefined") {
      var code = carrier_check.country_code;
      msisdn = "0" + msisdn.substring(code.length, msisdn_length)
    }
    else {
      console.log("sim_msisdn_check : is not msisdn")
    }
  }
  if (result == 1) {
    if (sim_check != "undefined") {

      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|msisdn|STRING|" + msisdn + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|etc_msisdn_flag|INT|" + 0 + "|")

      //mysql 업데이트 해주어야 한다.
      var dbmsg = "DB|ETC|MSISDN|" + imsi + "|" + msisdn + "|";
      addon_child.send_data(dbmsg);
    }
    else {
      //imsi is not found
      console.log("MP sim_msisdn_check : is not found sim imsi " + imsi);
      write_log("MP sim_msisdn_check : is not found sim imsi " + imsi);
    }
  }
  else {
    //mysql 실패결과를 업데이트 해주어야 한다.
    var dbmsg = "DB|ETC|ERR|" + imsi + "|5|";
    addon_child.send_data(dbmsg);
  }
}


//심 충전후 결과를 받아 업데이트한다.
function sim_charge(dictdata) {
  //mysql 업데이트 해주어야 한다.
  // MP|CHARGE|conID|IMSI|result|충전금액|    result  : 1 성공 / 0 -실패 / -1  채널로스 실패
  //성공시 realm에 업데이트 해주어야 한다.
  var conID = dictdata['data2']
  var imsi = dictdata['data3']
  var result = dictdata['data4']
  var charging_balance = parseInt(dictdata['data5'])
  if (result == 1) {
    if (user_sim_checker.length > 0) {
      var balance = sim_check.sim_balance + charging_balance
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|sim_balance|INT|" + balance + "|")
      bull_add_data("REALM|MODIFY|SIM|" + sim_check.imsi + "|imsi = '" + sim_check.imsi + "'|etc_charge_flag|INT|" + 0 + "|")

      //mysql 업데이트 해주어야 한다.
      var dbmsg = "DB|ETC|CHARGE|" + imsi + "|" + charging_balance + "|";
      addon_child.send_data(dbmsg);
    }
    else {
      //imsi is not found
      console.log("MP sim_charge : is not found sim imsi " + imsi);
      write_log("MP sim_charge : is not found sim imsi " + imsi);
    }
  }
  else {
    //mysql 실패결과를 업데이트 해주어야 한다.
    var dbmsg = "DB|ETC|ERR|" + imsi + "|6|";
    addon_child.send_data(dbmsg);

  }
}
