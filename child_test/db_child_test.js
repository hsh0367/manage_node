console.log("[DB] ON")
const crypto = require('crypto');
const chema = require('../global.js')
const global_value = require('../global_value.js')
const DB = require('/home/ubuntu/manage_node/child_test/database.js')
var database = new DB();
var mysql = require('mysql');
var Queue = require('bull');
var DbDataQueue = new Queue('DbDataQueue');
var DbJobQueue = new Queue('DbJobQueue');
var addon = require('bindings')('addon');
addon.setCallback(5555, data_test);


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
  fs.writeFile('../log/child/db_child_log' + dd + ".txt", '[' + d + ']' + data + '\n', options, function(err) {});
}

function timeConverter(UNIX_timestamp) {
  if (UNIX_timestamp == 0) {
    var time = "0000-00-00 00:00:00";
    return time;
  }
  else {

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
}
DbJobQueue.process(function(job, done) {
  // console.log("jobQueue : ", job.data.msg);
  console.log("jobque");
  DB_classifier(job.data.msg);
  done();
});

function data_test(msg) {
  console.log(msg);
  console.log("Data in")
  DbDataQueue.add({
    msg: msg
  });
}
var connection = mysql.createConnection({
  host: 'everytt-rds.cf5whdjkixxd.ap-southeast-1.rds.amazonaws.com',
  user: 'everytt',
  password: 'dpqmflTT1#',
  database: 'smartTT'
});

connection.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});
connection.on('error', function(err) {
  if(error.code =='PROTOCOL_CONNECTION_LOST' ){
    var connection = mysql.createConnection({
      host: 'everytt-rds.cf5whdjkixxd.ap-southeast-1.rds.amazonaws.com',
      user: 'everytt',
      password: 'dpqmflTT1#',
      database: 'smartTT'
    });

  }
});
function parser(data) {
  var str = data;
  var command_divied = str.split("END");
  var job_que = [];
  command_divied.forEach(function(dummy) {
    var parser_data = dummy.trim().split("|");
    var dict = {};
    for (var i = 0; i < parser_data.length; i++) {
      if (i === 0) { //command
        dict["command"] = parser_data[0];
      }
      else {
        dict["data" + i] = parser_data[i];
      }
    }
    DbJobQueue.add({
      msg: dict
    });
  });
};

function DB_classifier(data) {
  console.log("DB_classifier")
  switch (data['data1']) {

    case 'D00':
      //call function
      console.log("유저보기");
      view()
      break;
    case 'D01': //회원가입
      //call function
      console.log("회원가입");
      register(data);
      break;
      //call function
    case 'D02': //push-key 갱신
      //call function
      console.log("fcm-key 갱신");
      fcm_key_renewal(data);
      break;
    case 'D03': //voip-key 갱신
      //call function
      console.log("voip-key 갱신");
      voip_key_renewal(data);
      break;
    case 'D04': //voip-key 갱신
      //call function
      console.log("auto_flag_renewal 갱신");
      auto_flag_renewal(data);
      break;
    case 'D05': //voip-key 갱신
      //call function
      console.log("buy_sim");
      buy_sim(data);
      break;
    case 'D06': //voip-key 갱신
      //call function
      console.log("TOPUP");
      top_up(data);
      break;
    case 'D07': //voip-key 갱신
      //call function
      console.log("call");
      call_drop(data);
      break;
    case 'D08': //voip-key 갱신
      //call function
      console.log("sms");
      sms_result(data);
      break;
    case 'VOICE': //voip-key 갱신
      //call function
      console.log("VOICE");
      voice_result(data);
      break;
    case 'ETC': //voip-key 갱신
      //call function
      console.log("ETC");
      etc_handler(data);
      break;
    case 'QUERY': //realm mysql 데이터베이스 동기화
      //call function
      console.log("QUERY")
      query_processor(data);
      break;
    case 'SIM_CH': //realm mysql 데이터베이스 동기화
      //call function
      sim_info_change(data);
      break;
    case 'MSG_USSD': //realm mysql 데이터베이스 동기화
      //call function
      msg_ussd(data);
      break;
    default:
      console.log(data);
  }
}

function msg_ussd(dictdata) {
  var imsi = dictdata['data2']
  var contents = dictdata['data3']
  var time = parseInt(dictdata['data4']) * 1000
  var reg_date = timeConverter(time);
  var phone_number = dictdata['data5']


  var sql = "INSERT INTO tb_ussd_data ( imsi  , contents ,  reg_date, phone_number ) values ( \"" + imsi + "\", \"" + contents + "\", \"" + reg_date + "\"" + phone_number + "\")"
  query_Launcher(sql);
}




function voice_result(dictdata) {
  // DB|VOICE|call_type|codec|mobile|port|recv_app|recv_mobile|app_addr|mobile_addr|s_date|e_date|
  var call_type = dictdata['data2']
  var codec = dictdata['data3']
  var mobile = dictdata['data4']
  var port = dictdata['data5']
  var recv_app = dictdata['data6']
  var recv_mobile = dictdata['data7']
  var app_addr = dictdata['data8']
  var mobile_addr = dictdata['data9']
  var s_date = parseInt(dictdata['data10'])
  var e_date = parseInt(dictdata['data11'])


  var sql = "INSERT INTO tb_voip_info(call_type,codec, mobile, port, recv_app, recv_mobile, app_addr, mobile_addr, s_date, e_date) VALUES (" + call_type + "," + codec + ",\"" + mobile + "\"," + port + "," + recv_app + ", " + recv_mobile + ",\"" + app_addr + "\",\"" + mobile_addr + "\",\"" + timeConverter(s_date * 1000) + "\",\"" + timeConverter(e_date * 1000) + "\");";
  query_Launcher(sql);
}


function view() {
  connection.query("SELECT * FROM tb_sim_list_test", function(err, result, fields) {
    if (err) throw err;
    console.log(result);
  });
}

function register(dictdata) {
  var command_line = dictdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var user_pid = command_line['data2'];
  var user_serial = command_line['data3'];
  var user_id = command_line['data4'];
  var user_pw = command_line['data5'];
  var join_type = command_line['data6'];

  var sql = "INSERT INTO tb_user_test(pid,serial_no, id, pw, join_type) VALUES(" + parseInt(user_pid) + ",\"" + user_serial + "\",\"" + user_id + "\",\"" + user_pw + "\", " + parseInt(join_type) + ");";
  query_Launcher(sql);
}

function auto_flag_renewal(dictdata) {

  var command_line = dictdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var user_pid = command_line['data2'];
  var auto_flag = command_line['data3'];

  var sql = "UPDATE tb_user_test SET auto_flag =" + auto_flag + " WHERE pid = " + user_pid;
  console.log(sql);
  // connection.query(sql, function(err, rows, fields) {
  //   if (err)
  //     console.log('Error while auto_flag_renewal Query.');
  // });
  query_Launcher(sql);
  console.log("auto_flag_renewal end");
}

function fcm_key_renewal(dictdata) {

  var command_line = dictdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var user_serial = command_line['data2'];
  var fcm_key = command_line['data3'];

  var sql = "UPDATE tb_user_test SET push_key =\"" + fcm_key + "\" WHERE serial_no = \"" + user_serial + "\"";
  console.log(sql);
  // connection.query(sql, function(err, rows, fields) {
  //   if (err)
  //     console.log('Error while auto_flag_renewal Query.');
  // });

  write_log("fcm_key_renewal query : " + sql)
  query_Launcher(sql);
}

function voip_key_renewal(dictdata) {

  var command_line = dictdata;
  var command = command_line['command'];
  var sub_command = command_line['data1'];
  var user_serial = command_line['data2'];
  var voip_key = command_line['data3'];
  var sql = "UPDATE tb_user_test SET push_key =\"" + voip_key + "\" WHERE serial_no = \"" + user_serial + "\"";
  console.log(sql);
  // connection.query(sql, function(err, rows, fields) {
  //   if (err)
  //     console.log('Error while voip_key_renewal Query.');
  // });
  query_Launcher(sql);
  write_log("voip_key_renewal query : " + sql)

}

function query_processor(dictdata) {

  var command_line = dictdata;
  var command = command_line['command'];
  var query = command_line['data2'];
  console.log("query_processor ", query)
  query_Launcher(query);
}

function query_Launcher(query) {
  connection.query(query, function(err, rows, fields) {
    console.log(query);
    if (!err) {

      console.log('The solution is: ', rows);
      console.log("end")
    }
    else {
      console.log(err);
    }
  });
}

function buy_sim(dictdata) {

  var command_line = dictdata;
  var sub_command = command_line['data1'];
  var user_credit = parseInt(command_line['data2']) * global_value.mysql_credit_rate;
  var user_pid = command_line['data3'];
  var expire_match_date = command_line['data4']; //where
  var sim_imsi = command_line['data5'];
  var user_id = command_line['data6']; //where
  var user_serial = command_line['data7'];
  var mobile_number = command_line['data8'];
  var credit = parseInt(command_line['data9']) * global_value.mysql_credit_rate;
  var type = parseInt(command_line['data10']);
  var content = command_line['data11'];
  var db_user_credit = parseInt(command_line['data12']) * global_value.mysql_credit_rate;
  var credit_flag = parseInt(command_line['data13']);
  var reg_date = command_line['data14'];
  var description = command_line['data15'];

  write_log("buy_sim")
  try {
    var p = new Promise(function(resolve, reject) {
      resolve("Success!");
      reject("Error!");
    });
    var db_user_msg = "UPDATE tb_user_test set credit = " + parseInt(user_credit) + " WHERE pid  = " + parseInt(user_pid) + "";
    var db_sim_msg = "UPDATE tb_sim_list_test set user_id = '" + user_id + "',  expire_match_date = '" + expire_match_date + "' WHERE imsi  = '" + sim_imsi + "'";
    var db_credit_history_msg = "INSERT INTO tb_credit_history (id, user_serial, mobile_number, credit, type, content, user_credit, credit_flag, reg_date, description) VALUES ('" + user_id + "','" + user_serial + "','" + mobile_number + "'," + credit + "," + type + ",'" + content + "'," + db_user_credit + "," + credit_flag + ",'" + reg_date + "','" + description + "')";
    console.log("--------- ", user_id);
    console.log("------------------------------ " + expire_match_date);
    var promis = new Promise(function(resolve, reject) {
      resolve("Success!");
      reject("Error!");
    });

    promis.then(query_Launcher(db_user_msg)).then(query_Launcher(db_sim_msg)).then(query_Launcher(db_credit_history_msg));
  }
  catch (e) {
    console.log(e);
    console.log("ERROR DB-BUY_SIM : not found sub_command");
    write_log("ERROR DB-BUY_SIM : not found sub_command");
    write_log(e);
  }
}

function top_up(dictdata) {

  var command_line = dictdata;
  var command = command_line['command'];
  var credit = parseInt(command_line['data3']) * global_value.mysql_credit_rate;
  var user_id = command_line['data4']; //where
  var user_serial = command_line['data5'];
  var charge_credit = parseInt(command_line['data6']) * global_value.mysql_credit_rate;
  var type = parseInt(command_line['data7']); //where
  var credit_flag = parseInt(command_line['data8']); //where
  var description = command_line['data9']; //where
  var reg_date = command_line['data10']; //where
  var user_credit = parseInt(command_line['data11']) * global_value.mysql_credit_rate; //where
  var event_flag = parseInt(command_line['data12']); //where
  var mobile_number = command_line['data13']; //where
  var topup_type = command_line['data14']; //where
  var join_app_type = parseInt(command_line['data15']); //where
  var content = command_line['data16']; //where
  var credit_pid = 0;

  write_log("top_up");

  try {

    var db_user_msg = "UPDATE tb_user_test set credit = credit +" + charge_credit + ", charge_cnt = charge_cnt + 1, coupon =coupon+1 WHERE pid = " + user_pid;
    var db_credit_history_msg = "INSERT INTO tb_credit_history_test (id, user_serial,credit, type, credit_flag , description , reg_date , user_credit, event_flag , mobile_number, topup_type, join_app_type , content ) VALUES ('" + user_id + "','" + user_serial + "'," + charge_credit + "," + type + "," + credit_flag + "," + description + ",'" + reg_date + "'," + user_credit + "," + event_flag + ",'" + mobile_number + "','" + description + "','" + topup_type + "'," + join_app_type + ",'" + content + "')";
    var db_charge_list_msg = "INSERT INTO tb_charge_list (id, user_serial,charge_credit, reg_date, email ) VALUES ('" + user_id + "','" + user_serial + "'," + charge_credit + ",'" + reg_date + "'" + description + "','" + credit_pid + "')"

    write_log("top_up  : " + db_user_msg);
    write_log("top_up  : " + db_credit_history_msg);
    write_log("top_up  : " + db_charge_list_msg);

    promis.then(query_Launcher(db_user_msg)).then(function(db_credit_history_msg) {

      connection.query(db_credit_history_msg, function(err, rows, fields) {
        console.log(db_credit_history_msg);
        credit_pid = result.insertId;
        db_charge_list_msg = "INSERT INTO tb_charge_list (id, user_serial,charge_credit, reg_date, email ) VALUES ('" + user_id + "','" + user_serial + "'," + charge_credit + ",'" + reg_date + "'" + description + "','" + credit_pid + "')"
        if (!err) {
          console.log('The solution is: ', rows);
          console.log("end")
        }
        else {
          console.log(err);
          write_log("top_up  : " + err);
        }
      });

    }).then(query_Launcher(db_charge_list_msg))
  }
  catch (e) {
    console.log(e);
    console.log("ERROR DB top_up : top_up not found sub_command");
    write_log("ERROR DB top_up : " + e);
  }
}

function call_drop(dictdata) {
  console.log(dictdata)
  write_log("call_drop : " + dictdata);
  var user_pid = dictdata['data2'];
  var user_serial = dictdata['data3'];
  var user_id = dictdata['data4'];
  var credit = parseInt(dictdata['data5']) * global_value.mysql_credit_rate;
  var imsi = dictdata['data6'];
  var outbound = dictdata['data7'];
  var simbank_name = dictdata['data8'];
  var sim_serial_no = dictdata['data9'];
  var description = dictdata['data10'];
  var deducted_credit = parseInt(dictdata['data11']) * global_value.mysql_credit_rate;
  var credit_flag = dictdata['data12'];
  var area_name = dictdata['data13'];
  var content = dictdata['data14'];
  var type = dictdata['data15'];
  var TYPE = dictdata['data16'];
  var s_date = parseInt(dictdata['data17']);
  var c_date = parseInt(dictdata['data18']);
  var e_date = parseInt(dictdata['data19']);
  var con_id = dictdata['data20'];
  var call_result = dictdata['data21'];

  var now = Date.now();
  var total_time = e_date - s_date

  if (c_date != 0) {
    var use_time = e_date - c_date
  }
  else {
    var use_time = 0
  }
  var isAppSend = 0
  var reg_date = timeConverter(Date.now());

  if (TYPE == 'CALLOUT') {
    isAppSend = 1
  }
  else {
    isAppSend = 0
  }


  // ERR-CON,ERR-USER
  console.log(call_result)
  if (call_result == "SUCCESS") {

    try {
      var p = new Promise(function(resolve, reject) {
        resolve("Success!");
        reject("Error!");
      });


      var content = "CALL"
      var credit_flag = 104
      var type = 0; // 가감 부분 0이면 - 이면 +
      var db_user_msg = "UPDATE tb_user_test set credit = " + credit + " WHERE pid  = " + user_pid + "";
      var db_credit_history_msg = "INSERT INTO tb_credit_history (id, user_serial, mobile_number, credit, type, content, user_credit, credit_flag, reg_date, description) VALUES ('" + user_id + "','" + user_serial + "','" + outbound + "'," + deducted_credit + "," + type + ",'" + content + "'," + credit + "," + credit_flag + ",'" + reg_date + "','" + description + "')";


      var promis = new Promise(function(resolve, reject) {
        resolve("Success!");
        // 또는
        reject("Error!");
      });
      query_Launcher(db_user_msg)
      write_log("call-drop db_user_msg SUCESS : " + db_user_msg)
      write_log("call-drop db_credit_history_msg SUCESS : " + db_credit_history_msg)

      database.query(db_credit_history_msg)
        .then(rows => {
          var credit_pid = rows.insertId

          console.log("call credit_pid : " + credit_pid)
          var db_call_log_msg = "INSERT INTO tb_call_log (id, user_serial, con_id, mobile_number,  s_date, c_date, e_date, use_time, total_time, area_name, simbank_name, sim_imsi, sim_no, isAppSend,credit_pid) VALUES ( '" + user_id + "','" + user_serial + "','" + con_id + "','" + outbound + "', '" + timeConverter(s_date * 1000) + "','" + timeConverter(c_date * 1000) + "','" + timeConverter(e_date * 1000) + "'," + use_time + "," + total_time + ",'" + area_name + "','" + simbank_name + "','" + imsi + "'," + sim_serial_no + "," + isAppSend + "," + credit_pid + ")"
          console.log("call db_call_log_msg SUCESS : " + db_call_log_msg)
          write_log("call-drop db_call_log_msg SUCESS : " + db_call_log_msg)
          return database.query(db_call_log_msg);
        });
    }
    catch (e) {
      console.log(e);
      console.log("[CALL-DROP] ERROR : not found sub_command");
      write_log("[CALL-DROP] ERROR : not found sub_command error : " + e)
    }
  }
  else if (call_result == "ERR-CON") {
    console.log("err-con")

    var db_call_log_msg = "INSERT INTO tb_call_log (id, user_serial, con_id, mobile_number,  s_date, c_date, e_date, use_time, total_time, area_name, simbank_name, sim_imsi, sim_no, isAppSend) VALUES ( '" + user_id + "','" + user_serial + "','" + con_id + "','" + outbound + "', '" + timeConverter(s_date * 1000) + "','" + timeConverter(c_date * 1000) + "','" + timeConverter(e_date * 1000) + "'," + use_time + "," + total_time + ",'" + area_name + "','" + simbank_name + "','" + imsi + "'," + sim_serial_no + "," + isAppSend + ")"
    console.log(db_call_log_msg);
    write_log("call-drop db_call_log_msg ERR-CON : " + db_call_log_msg)
    query_Launcher(db_call_log_msg);
  }
  else {
    console.log("ERR-USER")
    console.log(db_call_log_msg);

    var db_call_log_msg = "INSERT INTO tb_call_log (id, user_serial, con_id, mobile_number,  s_date, c_date, e_date, use_time, total_time, area_name, simbank_name, sim_imsi, sim_no, isAppSend) VALUES ( '" + user_id + "','" + user_serial + "','" + con_id + "','" + outbound + "', '" + timeConverter(s_date * 1000) + "','" + timeConverter(c_date * 1000) + "','" + timeConverter(e_date * 1000) + "'," + use_time + "," + total_time + ",'" + area_name + "','" + simbank_name + "','" + imsi + "'," + sim_serial_no + "," + isAppSend + ")"
    write_log("call-drop db_call_log_msg ERR-USER : " + db_call_log_msg)
    query_Launcher(db_call_log_msg);
  }
}

function sms_result(dictdata) {
  var sub_command = dictdata['data2'];
  var user_pid = dictdata['data3'];
  var user_serial = dictdata['data4'];
  var user_id = dictdata['data5'];
  var credit = parseInt(dictdata['data6']) * global_value.mysql_credit_rate;
  var imsi = dictdata['data7'];
  var outbound = dictdata['data8'];
  var simbank_name = dictdata['data9'];
  var sim_serial_no = dictdata['data10'];
  var description = dictdata['data11'];
  var price = parseInt(dictdata['data12']) * global_value.mysql_credit_rate;
  var credit_flag = dictdata['data13'];
  var area_name = dictdata['data14'];
  var content = dictdata['data15'];
  var type = dictdata['data16'];
  var TYPE = dictdata['data17'];
  var sms_date = parseInt(dictdata['data18']);
  var error_code = dictdata['data19'];
  var sms_result = dictdata['data20'];

  if (sub_command == 'SMS_IN') {
    console.log("SMS_IN")
    write_log("SMS_IN")

    var db_sms_log_msg = "INSERT INTO tb_sms_list (id, user_serial, mobile_number, isAppsend,err_code,simbank_name,sim_imsi,sms_date) VALUES ( '" + user_id + "','" + user_serial + "','" + outbound + "'," + TYPE + ",'" + error_code + "','" + simbank_name + "','" + imsi + "', '" + timeConverter(sms_date) + "')"
    console.log(db_sms_log_msg);
    query_Launcher(db_sms_log_msg);
    write_log("SMS_IN db_sms_log_msg : " + db_sms_log_msg)
  }
  else {
    if (sms_result == "SUCCESS") {

      try {
        var p = new Promise(function(resolve, reject) {
          resolve("");
        });

        var content = "SMS"
        var credit_flag = 104
        var type = 0; // 가감 부분 0이면 - 이면 +
        var db_user_msg = "UPDATE tb_user_test set credit = " + credit + " WHERE pid  = " + user_pid + "";
        var db_credit_history_msg = "INSERT INTO tb_credit_history (id, user_serial, mobile_number, credit, type, content, user_credit, credit_flag, reg_date,  description) VALUES ('" + user_id + "','" + user_serial + "','" + outbound + "'," + price + "," + type + ",'" + content + "'," + credit + "," + credit_flag + ",'" + timeConverter(sms_date) + "','" + description + "')";

        console.log(db_credit_history_msg)
        write_log("SMS_OUT db_user_msg : " + db_user_msg)
        write_log("SMS_OUT db_credit_history_msg : " + db_credit_history_msg)

        query_Launcher(db_user_msg)
        database.query(db_credit_history_msg)
          .then(rows => {
            var credit_pid = rows.insertId
            console.log(credit_pid)
            var db_sms_log_msg = "INSERT INTO tb_sms_list (id, user_serial, mobile_number, isAppsend,err_code,simbank_name,sim_imsi, sms_date, credit_pid) VALUES ( '" + user_id + "','" + user_serial + "','" + outbound + "'," + TYPE + ",'" + error_code + "','" + simbank_name + "','" + imsi + "','" + timeConverter(sms_date) + "'," + credit_pid + ")"
            write_log("SMS_OUT db_sms_log_msg : " + db_sms_log_msg)
            return database.query(db_sms_log_msg);
          });
      }
      catch (e) {
        console.log(e);
        console.log("ERROR DB-BUY_SIM : not found sub_command");
        write_log("SMS_OUT ERR-USER db_sms_log_msg  error : " + e);
      }
    }
    else {
      console.log("err-user")
      var db_sms_log_msg = "INSERT INTO tb_sms_list (id, user_serial, mobile_number, isAppsend,err_code,simbank_name,sim_imsi, sms_date) VALUES ( '" + user_id + "','" + user_serial + "','" + outbound + "'," + TYPE + ",'" + error_code + "','" + simbank_name + "','" + imsi + "','" + timeConverter(sms_date) + "')"
      console.log(db_sms_log_msg);
      write_log("SMS_OUT ERR-USER db_sms_log_msg : " + db_sms_log_msg);
      query_Launcher(db_sms_log_msg);
    }
  }
}

function etc_handler(dictdata) {
  // "ETC|BALANCE|imsi|balance|"
  // "ETC|MSISDN|imsi|msisdn|"
  // "ETC|CHARGE|imsi|charging_balance|"
  // "ETC|ERR|imsi|5|"
  // "ETC|ERR|imsi|6|"
  // "ETC|ERR|imsi|7|"
  console.log("etc_handler is on")
  var sub_command = dictdata['data2'];
  if (sub_command == "BALANCE") {
    var imsi = dictdata['data3'];
    var balance = dictdata['data4'];


    var msg = "UPDATE tb_sim_list SET  balance = " + balance + " WHERE  imsi = \"" + imsi + "\"";
    console.log("DB ETC_HANDLER : " + msg);
    write_log("DB ETC_HANDLER : " + msg);
    query_Launcher(msg);
  }
  else if (sub_command == "MSISDN") {
    var imsi = dictdata['data3'];
    var msisdn = dictdata['data4'];

    var msg = "UPDATE tb_sim_list_test SET  sim_no = \"" + msisdn + "\" WHERE  imsi = \"" + imsi + "\"";
    console.log("DB ETC_HANDLER : " + msg);
    write_log("DB ETC_HANDLER : " + msg);
    query_Launcher(msg);

  }
  else if (sub_command == "CHARGE") {
    var imsi = dictdata['data3'];
    var charging_balance = dictdata['data4'];

    var msg = "UPDATE tb_sim_list_test SET  balance = balance + " + charging_balance + " WHERE  imsi = \"" + imsi + "\"";
    console.log("DB ETC_HANDLER : " + msg);
    write_log("DB ETC_HANDLER : " + msg);
    query_Launcher(msg);

  }
  else if (sub_command == "ERR") {
    var imsi = dictdata['data3'];
    var err_code = dictdata['data4'];

    var msg = "UPDATE tb_sim_list_test SET   sim_error = \"" + err_code + "\" WHERE  imsi = \"" + imsi + "\"";
    console.log("DB ETC_HANDLER : " + msg);
    write_log("DB ETC_HANDLER : " + msg);
    query_Launcher(msg);

  }
  else {
    console.log("DB ETC ERROR : is not subcommand");
    write_log("DB ETC ERROR : is not subcommand")
  }


}

DbDataQueue.process(function(job, done) {
  // console.log("dataQueue")
  console.log("dataque");
  parser(job.data.msg);
  done();
});
