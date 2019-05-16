var Realm = require('realm');
const chema = require('../global.js')
const global_value = require('../global_value.js')
var addon_child = require('bindings')('addon_child');
addon_child.setConnect(5555, "127.0.0.1");

let realm = new Realm({
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST],
  schemaVersion: 20
});

process.on('message', (value) => {
  console.log("mp is on");
  command_classifier(value.data);
});
function command_classifier(data) {
  switch (data['data1']) {
    case 'PAGING': //테이블 체크
      //call function
      console.log("mp_paging ");
      mp_paging(data);
      break;
    case 'PORT_ARRANGE': //회원가입
      //call function
      console.log("CALLIN");
      port_arrange(data);
      break;
    default:
      console.log("[CALL] not find sub command");
  }
}

function mp_paging(dictdata) {

  // MP|PAGING|SEQ|sim_imsi|tmsi|channel|mi_type|arfcn|cell_id|bsic|
  // MP|PAGING|SEQ|sim_imsi|imei|tmsi|kc|cksn|msisdn|simbank_id|sim_serial_no|lac|channel|mi_type|arfcn|cell_id|bsic|
  //
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



  var user_check = 'user_sim_imsi = "' + sim_imsi + '"';

  var now = Date.now();
  var user_sim_check = 'imsi = "' + sim_imsi + '"'



  let user_checker = realm.objects('USER').filtered(user_check);
  let user_sim_checker = realm.objects('SIM').filtered(user_sim_check);




  if (user_sim_checker.length > 0) {

    var msg = "MP|PAGING|" + seq + "|" + user_sim_checker[0].imsi + "|" + user_sim_checker[0].imei + "|" + user_sim_checker[0].tmsi + "|" + user_sim_checker[0].kc + "|" + user_sim_checker[0].cksn + "|" + user_sim_checker[0].msisdn + "|" + user_sim_checker[0].sim_id + "|" + user_sim_checker[0].sim_serial_no + "|" + user_sim_checker[0].lac + "|" + channel + "|" + mi_type + "|" + user_sim_checker[0].arfcn + "|" + user_sim_checker[0].cell_id + "|" + user_sim_checker[0].bsic + "|"
    process.send(msg);
  }
  else {
    var msg = "MP|PAGING|" + seq + "|" + sim_imsi + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + 0 + "|" + channel + "|" + mi_type + "|" + 0 + "|" + 0 + "|" + 0 + "|"
    process.send(msg);
  }


}

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
