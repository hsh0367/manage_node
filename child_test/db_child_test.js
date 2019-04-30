var Realm = require('realm');
const crypto = require('crypto');
const chema = require('../global.js')

var mysql = require('mysql');
var Queue = require('bull');
var DbDataQueue = new Queue('DbDataQueue');
var DbJobQueue = new Queue('DbJobQueue');
var addon = require('bindings')('addon');
addon.setCallback(5555, data_test);

var simlist = [];
let realm = new Realm({
  schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST],
  schemaVersion: 19
});

DbJobQueue.process(function(job, done) {
  // console.log("jobQueue : ", job.data.msg);
  console.log("jobque");
  DB_classifier(job.data.msg);
  done();
});

function data_test(msg) {
  console.log(msg);
  console.log("Data in")
  console.log(msg)

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


function parser(data) {
  var str = data;
  var command_divied = str.split("END");
  var job_que = [];
  command_divied.forEach(function(dummy) {
    var parser_data = dummy.split("|");
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
    case 'D11': //realm mysql 데이터베이스 동기화
      //call function
      DB_synchronization(data);
      break;
    case 'QUERY': //realm mysql 데이터베이스 동기화
      //call function
      console.log("DB_classifier", data['data2'])
      query_processor(data);
      break;
    case 'CREDIT': //realm mysql 데이터베이스 동기화
      //call function
      credit_update(data);
      break;
    case 'SIM': //realm mysql 데이터베이스 동기화
      //call function
      sim_expire_date_update(data);
      break;
    default:
      console.log(data);
  }
}

function DB_synchronization(dictdata) {
  var command_line = dictdata;
  var chosechema = command_line['data2'];
  if (chosechema == 'SIM') {
    var sql = "SELECT pid, id,  sim_serial_no, imsi, simbank_name, mobileType, imei, sim_no,  sim_expire_date  FROM tb_sim_list_test;";
    //sql SELECT pid, id,  sim_serial_no, imsi, simbank_name FORM tb_sim_list

    connection.query(sql, function(err, result, fields) {
      if (err) throw err;
      // simlist = result;
      console.log("simlist length : " + result.length);

      for (var i = 0; i < result.length; i++) {
        var sim_check = 'sim_pid =  \"' + result[i].pid + '\" AND imsi = \"' + result[i].imsi + '\"';
        let sim_checker = realm.objects('SIM').filtered(sim_check);
        var tt = result.length - i;
        console.log("sim_checker length : " + tt);

        if (sim_checker.isEmpty()) {
          realm.write(() => {

            let sim = realm.create('SIM', {
              sim_pid: result[i].pid,
              sim_id: result[i].id,
              sim_serial_no: result[i].sim_serial_no,
              simbank_name: result[i].simbank_name,
              imsi: result[i].imsi,
              mobileType: result[i].mobileType,
              msisdn: result[i].sim_no,
              imei: result[i].imei,
              sim_expire_date: result[i].sim_expire_date.getTime(),

            });
          });
        }
        else {
          console.log("이미 있는 sim 입니다.")
        }
      }
      console.log("DB_synchronization end");
    });


  }
  else if (chosechema == 'USER') {

    var sql = "SELECT id, pid FROM tb_user_test;";
    //sql SELECT pid, id,  sim_serial_no, imsi, simbank_name FORM tb_sim_list

    connection.query(sql, function(err, result, fields) {
      if (err) throw err;
      // simlist = result;
      console.log("user length : " + result.length);
      realm.objects('USER');

      for (var i = 0; i < result.length; i++) {
        var user_check = 'user_pid =  \"' + result[i].pid + '\"';
        let user_checker = realm.objects('USER').filtered(user_check);
        if (user_checker.length == 0) {
          realm.write(() => {
            let sim = realm.create('USER', {
              user_pid: result[i].pid,
              user_id: result[i].id,
            });

          });
        }
        else {
          console.log("이미 있는 user pid 입니다.")
        }
      }
    });
    console.log("DB_synchronization end");
  }
  else if (chosechema == 'RATE') {
    var sql = "SELECT area_name, area_no, unit, value, pid FROM tb_rate;";

    connection.query(sql, function(err, result, fields) {

      if (err) throw err;
      // simlist = result;
      console.log("rate length : " + result.length);
      realm.objects('RATE');

      let rate_length = realm.objects('RATE').length;

      for (var i = 0; i < result.length; i++) {
        var rate_check = 'id =  \"' + result[i].pid + '\"';
        let rate_checker = realm.objects('RATE').filtered(rate_check);
        console.log("rate " + i + "  : " + parseFloat(result[i].value.toFixed(3)))
        if (rate_checker.length == 0) {
          realm.write(() => {
            let rate = realm.create('RATE', {
              id: result[i].pid,
              area_no: result[i].area_no,
              area_name: result[i].area_name,
              call_value: parseFloat(result[i].value.toFixed(3)),
              call_unit: result[i].unit,
            });

          });
        }
        else {
          console.log("이미 있는 rate 입니다.")
        }
      }
    });
    console.log("DB_synchronization end");
  }

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


  // connection.query('INSERT INTO tb_user_test(serial_no, id, pw, join_type) VALUES(' + serial + "," + id + "," + pw + "," + join_type + ");",
  // connection.query(sql, function(err, rows, fields) {
  //   if (!err)
  //     console.log('The solution is: ', rows);
  //   else
  //     console.log('Error while register Query.');
  // });
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
}

function query_processor(dictdata) {

  var command_line = dictdata;
  var command = command_line['command'];
  var query = command_line['data2'];
  // connection.query(query, function(err, rows, fields) {
  //   if (!err)
  //     console.log('The solution is: ', rows);
  //   else {
  //     console.log('Error while query_processor Query.');
  //     console.log(query);
  //   }
  // });

  console.log("query_processor ", query)
  query_Launcher(query);
}

function credit_update(dictdata) {
  var command_line = dictdata;
  var command = command_line['command'];
  var num = command_line['data2'];
  var user_pid = parseInt(command_line['data3']);
  var user_check = 'user_pid = "' + user_pid + '"';
  let user_checker = realm.objects('USER').filtered(user_check);
  try {
    realm.write(() => {
      user_checker[0].credit = parseInt(num);
    })
    var sql = "UPDATE tb_user_test set credit = " + num + " WHERE pid  = " + user_pid;

    query_Launcher(sql);

  }
  catch (e) {
    console.log("credit_update error")
  }
}

function sim_expire_date_update(dictdata) {
  var command_line = dictdata;
  var command = command_line['command'];
  var sim_check = 'imsi != ""  AND user_id = "0" AND user_pid = 0';
  let sim_checker = realm.objects('SIM').filtered(sim_check);
  var now = Date.now();
  var seven = 86400000 * 15;
  var temp = now + seven;


  try {
    realm.write(() => {

      for (var i = 0; i < sim_checker.length; i++) {
        sim_checker[i].sim_expire_date = temp;
      }
    })

    // var sql = "UPDATE tb_sim_list_test set sim_expire_date = " + temp;
    // query_Launcher(sql);
    console.log("sim end")
  }
  catch (e) {
    console.log("credit_update error")
  }
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

  // var buy_sim_msg = "DB|D05|" + user_checker[0].credit + "|" + user_checker[0].user_pid + "|" +
  //   +"|" + timeConverter(temp) + "|" + user_sim_checker[0].imsi + "|" +
  //   user_checker[0].user_id + "|" + user_checker[0].user_serial + "|" +user_sim_checker[0].msisdn +
  //   "|500|0|,SIM|" + user_checker[0].credit * 10 + "|100|" + timeConverter(now) +"|" + description+"|"
  //

  var command_line = dictdata;
  var sub_command = command_line['data1'];
  var user_credit = parseInt(command_line['data2']);
  var user_pid = command_line['data3'];
  var expire_match_date = command_line['data4']; //where
  var sim_imsi = command_line['data5'];
  var user_id = command_line['data6']; //where
  var user_serial = command_line['data7'];
  var mobile_number = command_line['data8'];
  var credit = parseInt(command_line['data9']);
  var type = parseInt(command_line['data10']);
  var content = command_line['data11'];
  var db_user_credit = parseInt(command_line['data12']);
  var credit_flag = parseInt(command_line['data13']);
  var reg_date = command_line['data14'];
  var description = command_line['data15'];


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
      // 또는
      reject("Error!");
    });

    promis.then(query_Launcher(db_user_msg)).then(query_Launcher(db_sim_msg)).then(query_Launcher(db_credit_history_msg));
  }
  catch (e) {
    console.log(e);
    console.log("ERROR DB-BUY_SIM : not found sub_command");
  }
}

function top_up(dictdata) {

  // var db_user_msg = "DB|D06|" + credit + "|" + user_checker[0].user_pid + "|";
  // var db_credit_history_msg = "DB|D06|" + user_checker[0].user_id + "|" + user_checker[0].user_serial + "|" + credit + "|1|1|" + description + "|" + timeConverter(Date.now()) + "|" + user_checker[0].credit + "|" + event_flag + "|" + user_checker[0].user_sim_imsi + "ACCOUNT|0|TOPUP|";
  // var db_charge_list_msg = "DB|D06|" + user_checker[0].user_id + "|" + user_checker[0].user_serial + "|" + credit + "|" + timeConverter(Date.now()) + "|" + description + "|"


  // var db_top_up_msg = "DB|D06|" + user_checker[0].user_pid + "|" + user_checker[0].user_id + "|" +
  //   user_checker[0].user_serial + "|" + charge_credit + "|1|1|" + description + "|" + timeConverter(Date.now()) + "|" +
  //   user_checker[0].credit + "|" + event_flag + "|" + user_sim_checker[0].msisdn + "ACCOUNT|0|TOPUP|";

  var command_line = dictdata;
  var command = command_line['command'];
  var user_pid = parseInt(command_line['data3']);
  var user_id = command_line['data4']; //where
  var user_serial = command_line['data3'];
  var charge_credit = parseInt(command_line['data4']);
  var type = parseInt(command_line['data5']); //where
  var credit_flag = parseInt(command_line['data5']); //where
  var description = command_line['data5']; //where
  var reg_date = command_line['data5']; //where
  var user_credit = parseInt(command_line['data5']); //where
  var event_flag = parseInt(command_line['data5']); //where
  var mobile_number = command_line['data5']; //where
  var topup_type = command_line['data5']; //where
  var join_app_type = parseInt(command_line['data5']); //where
  var content = command_line['data5']; //where
  var credit_pid = 0;




  try {

    var db_user_msg = "UPDATE tb_user_test set credit = credit +" + charge_credit + ", charge_cnt = charge_cnt + 1, coupon =coupon+1 WHERE pid = " + user_pid;
    var db_credit_history_msg = "INSERT INTO tb_credit_history_test (id, user_serial,credit, type, credit_flag , description , reg_date , user_credit, event_flag , mobile_number, topup_type, join_app_type , content ) VALUES ('" + user_id + "','" + user_serial + "'," + charge_credit + "," + type + "," + credit_flag + "," + description + ",'" + reg_date + "'," + user_credit + "," + event_flag + ",'" + mobile_number + "','" + description + "','" + topup_type + "'," + join_app_type + ",'" + content + "')";
    var db_charge_list_msg = "INSERT INTO tb_charge_list (id, user_serial,charge_credit, reg_date, email ) VALUES ('" + user_id + "','" + user_serial + "'," + charge_credit + ",'" + reg_date + "'" + description + "','" + credit_pid + "')"

    //user_checker[0].user_id + "|" + user_checker[0].user_serial + "|" + credit + "|1|1|" + description + "|" + timeConverter(Date.now()) + "|" + user_checker[0].credit + "|" + event_flag + "|" + user_checker[0].user_sim_imsi + "ACCOUNT|0|TOPUP|";
    //var db_charge_list_msg = " DB|QUERY|INSERT INTO tb_charge_list (id, user_serial,charge_credit, reg_date, email ) VALUES ('" + user_checker[0].user_id + "','" + user_checker[0].user_serial + "','7500','" + timeConverter(Date.now()) + "','" + description + "')|"
    //var db_charge_list_msg = "user_checker[0].user_id + "|" + user_checker[0].user_serial + "|" + credit + "|" + timeConverter(Date.now()) + "|" + description + "|"

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
        }
      });

    }).then(query_Launcher(db_charge_list_msg))
  }
  catch (e) {
    console.log(e);
    console.log("ERROR DB-BUY_SIM : top_up not found sub_command");
  }

}




DbDataQueue.process(function(job, done) {
  // console.log("dataQueue")
  console.log("dataque");
  parser(job.data.msg);
  done();
});
