/*
 * tcpclient.c - A simple TCP client
 * usage: tcpclient <host> <port>
 */
 #include <netinet/tcp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include "netinet/in.h"
#include "arpa/inet.h"
   #include <unistd.h>
#define BUFSIZE 1024



int main(int argc, char **argv) {
    int option = 1;
    struct timeval tv;
      tv.tv_sec  = 30;
      tv.tv_usec = 0;
    int sockfd, portno, n;
    struct sockaddr_in serveraddr;
    struct hostent *server;
    char *hostname;
    char buf[BUFSIZE];

    char serial_no[20] = {0};
    int user_pid = 0 ;
printf("test4");
    /* check command line arguments */


    //int test  = isValidEmailAddress( argv[1] );

    //printf( "%s %d \n", argv[1] , test);


    /* socket: create the socket */
    sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd < 0)
        printf("ERROR opening socket");

    /* gethostbyname: get the server's DNS entry */

    /* build the server's Internet address */


    	memset(&serveraddr,0,sizeof(serveraddr));

    serveraddr.sin_family = AF_INET;
    serveraddr.sin_addr.s_addr = inet_addr("127.0.0.1");
    serveraddr.sin_port = htons(5000);
printf("test2");

  setsockopt( sockfd, IPPROTO_TCP, TCP_NODELAY, &option, sizeof(option));
  setsockopt( sockfd, SOL_SOCKET, SO_RCVTIMEO, (char*)&tv, sizeof(struct timeval));


    /* connect: create a connection with the server */
  if (connect(sockfd, (struct sockaddr *)&serveraddr, sizeof(serveraddr)) < 0)
      printf("ERROR connecting");

    /* get message line from the user */

printf("test");
    /* send the message line to the server */

    for( int i= 0; i <10000; i++ )
    {
      char send_data[128] ={0} ;
      sprintf( send_data, "POLICY|CS6|%d|200001|hsh0367@naver.com|0|", i );
      n = send(sockfd, send_data, strlen(send_data), 0);

      printf( "%s\n", send_data) ;
     usleep(10000);

    }
    usleep(10000);


    close(sockfd);

    return 0;
}
