//심가격, 심만료 추가일, 전화 분당 가격, 전화 기준 시간

var sim_price = 500;
var sms_price = 3;

var expire_match_addtional_days = 86400000 * 7;
var call_value = 0.15;
var call_unit = 60;
var country_code = 62;
var lur_time = 6000000; //1시간 ms
var lur_check_time = 60000; //1시간 ms
var etc_check_time = 60000; //1시간 ms
var value_credit_rate = 100; // rate value credit 환산시 값
var mysql_credit_rate = 10;


exports.call_drop_time = function call_drop_time(credit, unit, value) {
  try {

    if (credit > value*100 && value !=0) {

      var available_time_m = 0.00;
      available_time_m = Math.floor(credit / (value * value_credit_rate))
      var available_time_s = parseInt(available_time_m.toFixed(0));
      return available_time_s
    }
    else {

      return 0
    }
  }
  catch (e) {
    console.log(e);
  }
}

exports.deducted_credit = function deducted_credit(call_time, unit, value) {
  if (call_time != 0 && unit != 0) {

    var deducted_credit = Math.ceil(call_time / unit) * value * value_credit_rate;
    return deducted_credit
  }
  else {
    return 0
  }
}

exports.sim_price = sim_price;
exports.sms_price = sms_price;
exports.expire_match_addtional_days = expire_match_addtional_days;
exports.call_value = call_value;
exports.call_unit = call_unit;
exports.country_code = country_code;
exports.lur_time = lur_time;
exports.lur_check_time = lur_check_time;
exports.value_credit_rate = value_credit_rate;
exports.mysql_credit_rate = mysql_credit_rate;
exports.etc_check_time = etc_check_time;
