const mysql = require( 'mysql' );
let config = {
  host: 'everytt-rds.cf5whdjkixxd.ap-southeast-1.rds.amazonaws.com',
  user: 'everytt',
  password: 'dpqmflTT1#',
  database: 'smartTT'

};
class Database {
    constructor( config ) {
        this.connection = mysql.createConnection( config );
    }
    query( sql, args ) {
        return new Promise( ( resolve, reject ) => {
            this.connection.query( sql, args, ( err, rows ) => {
                if ( err )
                    return reject( err );
                resolve( rows );
            } );
        } );
    }
    close() {
        return new Promise( ( resolve, reject ) => {
            this.connection.end( err => {
                if ( err )
                    return reject( err );
                resolve();
            } );
        } );
    }
}
Database.execute = function(callback) {
const database = new Database(config);
return callback(database)
};
