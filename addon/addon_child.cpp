#include <nan.h>
#include <boost/lockfree/queue.hpp>
#include <boost/lockfree/spsc_queue.hpp>
#include <functional>
#include <utility>
#include <queue>
#include "stdio.h"
#include "stdlib.h"
#include "string.h"
#include "time.h"
#include "sys/types.h"
#include "sys/socket.h"
#include "netinet/in.h"
#include "arpa/inet.h"
#include <v8.h>
#include <pthread.h>
#include <unistd.h>
#include <string.h>
#include <signal.h>
#include <sys/time.h>
#include <stdarg.h>
/* socket  */
#define RECV_THREAD 5
#define BUF_LEN 1024


pthread_t send_thread;
pthread_t node_socket_thread;
pthread_t socket_recv_thread[RECV_THREAD];
int socket_array[RECV_THREAD] ;
/* socket  */
int 	socket_max_set[RECV_THREAD] ;
fd_set  tcp_active_fd_set[RECV_THREAD], tcp_read_fd_set[RECV_THREAD] ;

int server_fd;


using namespace v8;
using namespace Nan;

namespace demo {
using v8::Isolate;
using v8::Function;
using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::NewStringType;
using v8::Object;
using v8::String;
using v8::Value;

std::queue<std::string> send_msg_queue = std::queue<std::string>();

pthread_mutex_t  send_queue_mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_t  send_queue_con_mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t   send_queue_cond  = PTHREAD_COND_INITIALIZER;
int  send_que_mutex_wait_state = 0 ;
int thread_state =0 ;

pthread_mutex_t  f_mutex = PTHREAD_MUTEX_INITIALIZER;
/*write_log*/
FILE *fp = NULL;
int fp_count = 0;
int o_month=0, o_day=0, o_year=0, n_month, n_day, n_year;

char log_tmp[1024];
char _LOG[1024];
char filename[128];

char node_ip[20];
int node_port ;
int node_sock;
int node_connect;

int node_max_fd;
fd_set node_active_fd_set, node_read_fd_set;


int write_log(  char *write_filename, int write_fileline , char *log_string, ... )
{

	pthread_mutex_lock(&f_mutex);

	struct tm *current;
	time_t timenow;


	time(&timenow);
	current = localtime(&timenow);
    n_month = current->tm_mon+1;
    n_day = current->tm_mday;
    n_year = current->tm_year+1900;



	if( o_month != n_month || o_day != n_day || o_year != n_year  )
	{
		o_month = n_month;
		o_day  	= n_day;
		o_year	= n_year;

		if( current != NULL  )
		{
			sprintf( filename, "./log/log_child-%d-%d-%d.txt", o_year, o_month, o_day);
			puts( filename );
		}
	}

	va_list argList;
    va_start(argList, log_string);

	vsnprintf(log_tmp, 1024 -30 , log_string, argList);
	va_end(argList);


	//sprintf( _LOG ,"[%02d:%02d:%02d %s:%d]%s\n", current->tm_hour, current->tm_min, current->tm_sec, write_filename, write_fileline, log_tmp );
	snprintf( _LOG, 1024 ,"[%02d:%02d:%02d %s:%d]%s\n", current->tm_hour, current->tm_min, current->tm_sec, write_filename, write_fileline, log_tmp );

	fp = fopen(filename, "a");
	if(fp)
	{

		fprintf(fp, "%s", _LOG);
		fflush(fp);
		fclose(fp);

	}

	pthread_mutex_unlock(&f_mutex);

	return 1;
}


int tcp_port =0 ;
struct sigaction act_new;


void termination_handler(int sig)
{
	if( sig ){ ; } //do nothing.

	if ( sig == SIGINT ||  sig == SIGTERM  || sig == SIGSTOP || sig == SIGQUIT || sig == SIGSEGV  || sig == SIGKILL || sig == SIGFPE )
	{
		printf("[sighandler] %d \n", sig );

		thread_state = 0;

		pthread_mutex_destroy(&send_queue_mutex);
		pthread_mutex_destroy(&send_queue_con_mutex);
    pthread_cond_destroy(&send_queue_cond);

    pthread_mutex_destroy(&f_mutex);
		exit(0);
	}



}


int node_sock_connect(  )
{
	int option = 1;
	struct timeval tv;
    tv.tv_sec  = 30;
    tv.tv_usec = 0;

	node_sock = socket(AF_INET, SOCK_STREAM, 0);


	struct sockaddr_in mainAddr;
	memset(&mainAddr,0,sizeof(mainAddr));
	mainAddr.sin_family = AF_INET;
	mainAddr.sin_addr.s_addr = inet_addr(node_ip);
  mainAddr.sin_port = htons(node_port);

	setsockopt( node_sock, IPPROTO_TCP, TCP_NODELAY, &option, sizeof(option));
	setsockopt( node_sock, SOL_SOCKET, SO_RCVTIMEO, (char*)&tv, sizeof(struct timeval));

	write_log(__FILE__, __LINE__, " %d  (%s:%d)",  node_sock , inet_ntoa(mainAddr.sin_addr), ntohs(mainAddr.sin_port));

	int ret = connect(node_sock,(struct sockaddr *)&mainAddr,sizeof(mainAddr));
	if( ret < 0 )
	{
		close(node_sock);
		node_connect =0;
		return 0;
	}
	else
	{

		FD_SET( node_sock, &node_active_fd_set);
		node_max_fd = node_sock;

		node_connect = 1;

		//node_send("Alive_Policy") ;
	}

	write_log(__FILE__, __LINE__, "node_sock_connect %d \n",  node_connect);

	return 1;
}

void* node_sock_thread_main(void *arg)
{

	//int  index  = *((int *)arg);

	node_connect =0;
//
	node_max_fd =0;


//
	struct timeval recvout;

	FD_ZERO( &node_active_fd_set );

	node_sock_connect(  );
//
	char buffer[1024];
	int ret;

	while(1)
	{
		recvout.tv_sec = 3 ;
		recvout.tv_usec = 0;
		node_read_fd_set =node_active_fd_set;


		ret =  select(node_max_fd+1 , &node_read_fd_set, NULL, NULL, &recvout);

		if( ret < 0 )
		{
			write_log(__FILE__, __LINE__, "select error\n");
			//exit(0);
			continue;
		}
		else if( ret == 0 )
		{
			//m_pFileLog->FileWrite(__FILE__, __LINE__, "select timeout (%d)\n", isConnect);

			if( node_connect == 0 )
			{
				node_sock_connect(  );
			}

			continue;
		}


		memset(buffer,0, 1024);

		write_log(__FILE__, __LINE__, "node thread \n");

		ret = recv( node_sock , buffer, 1024-1, 0 );


		if( ret <=  0 )
		{
			if( errno == EAGAIN  ||   errno == EWOULDBLOCK    )
			{

				sleep(1);
			}
			else
			{
				write_log(__FILE__, __LINE__, "recv timeout  (%d)",    node_connect );
				node_connect = 0;
				FD_CLR(  node_sock, &node_active_fd_set );
				close(node_sock);
			}

			continue;

		}
		else
		{
			write_log(__FILE__, __LINE__, "node thread[%s] \n" , buffer);
   		//recv_node_data( buffer );
		}
	}

	close(node_sock);


 	return 0;

}

void* send_thread_main( void *data  )
{
  struct timeval now;
  struct timespec ts;

  //unique_idx = 6000000 ;

  int recv_data = 0 ;

  while(thread_state)
  {
    recv_data = 0 ;
    std::string str ;//= std::string(*param1);

    gettimeofday(&now, NULL);
    ts.tv_sec = now.tv_sec + 10;
    ts.tv_nsec = now.tv_usec * 1000;

  //  write_log(__FILE__, __LINE__, "queue_thread\n");

    if( send_msg_queue.size() == 0 )
     {
       pthread_mutex_lock(&send_queue_con_mutex);
       send_que_mutex_wait_state = 1 ;
       pthread_cond_timedwait(&send_queue_cond, &send_queue_con_mutex, &ts);
       send_que_mutex_wait_state = 0 ;
       pthread_mutex_unlock(&send_queue_con_mutex);
     }

    //  memset( &data, 0, sizeof(RECV_MSG)) ;

      pthread_mutex_lock(&send_queue_mutex);
        if( !send_msg_queue.empty() )
        {
              str = send_msg_queue.front();
              send_msg_queue.pop();
              recv_data = 1;
        }
      pthread_mutex_unlock(&send_queue_mutex);






      if(recv_data){
        //write_log(__FILE__, __LINE__, "recv_data\n");
        int size = str.size() ;
        char send_data[1024] ={0};
        strcpy( send_data, str.c_str() );
        //std::vector<char> buff(size+ 1); // initializes to all 0's.
        //std::copy(str.begin(), str.end(), buff.begin());


      //  if( send_data[0] == 'P'){
          send(node_sock,send_data,size,0);
           write_log(__FILE__, __LINE__, "send_tcp_data  %d[%s]\n" , node_sock , send_data  );
      //  }
      //  else{
      //    send(mp_sock,send_data,size,0);
      //  }

         //write_log(__FILE__, __LINE__, "send_tcp_data  [%s]\n" , &buff );

      }


  }

}

int main_function()
{
  act_new.sa_handler = termination_handler;
  sigemptyset( &act_new.sa_mask);


  sigaction( SIGINT, &act_new, 0);
  sigaction( SIGTERM, &act_new, 0);
  sigaction( SIGSTOP, &act_new, 0);
  sigaction( SIGQUIT, &act_new, 0);

  sigaction( SIGSEGV, &act_new, 0);
  sigaction( SIGKILL, &act_new, 0);
  sigaction( SIGFPE, &act_new, 0);
	printf("main_function \n");




  pthread_mutex_init(&send_queue_mutex, NULL);
  pthread_mutex_init(&send_queue_con_mutex, NULL);
  pthread_mutex_init(&f_mutex, NULL);
  pthread_cond_init(&send_queue_cond, NULL);



  int status =0 ;
  thread_state = 1;

  pthread_create(&node_socket_thread, NULL, node_sock_thread_main, (void *)&status);
  pthread_create(&send_thread, NULL, send_thread_main, (void *)&status);
}



static void setConnect(const Nan::FunctionCallbackInfo<v8::Value>& info) {

  v8::Isolate *isolate = info.GetIsolate();

  node_port  =   info[0]->Int32Value();

  v8::String::Utf8Value param1(info[1]->ToString());
  std::string str = std::string(*param1);

  strcpy( node_ip, str.c_str() );

  main_function() ;


}



void Send_data(const Nan::FunctionCallbackInfo<v8::Value>& info) {

  if (info.Length() < 1) {
    Nan::ThrowTypeError("Wrong number of arguments");
    return;
  }

  v8::String::Utf8Value param1(info[0]->ToString());
  std::string str = std::string(*param1);


//  v8::<String> str = info[0]->ToString();
  // char* bar = ToCString(str);

/*
  std::vector<char> buff(str.size() + 1); // initializes to all 0's.
  std::copy(str.begin(), str.end(), buff.begin());
  //send_tcp_data(&buff[0]);
  send_queue_push( &buff[0] );
*/

  pthread_mutex_lock(&send_queue_mutex);

  send_msg_queue.push(str);
  pthread_mutex_unlock(&send_queue_mutex);


  pthread_mutex_lock(&send_queue_con_mutex);
  if( send_que_mutex_wait_state == 1 ) pthread_cond_signal(&send_queue_cond);
  pthread_mutex_unlock(&send_queue_con_mutex);

  // send_tcp_data(bar);
//  send_tcp_data( ToCString(info[0]->ToString()) );
}


static void Init(v8::Local<v8::Object> exports, v8::Local<v8::Object> module) {
  Nan::SetMethod(exports, "setConnect", setConnect);
  exports->Set(Nan::New("send_data").ToLocalChecked(),
              Nan::New<v8::FunctionTemplate>(Send_data)->GetFunction());

}

NODE_MODULE(addon, Init)
}
