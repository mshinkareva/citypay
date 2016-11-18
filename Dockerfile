FROM node:latest
MAINTAINER alexbljack@gmail.com

RUN apt-get update
RUN apt-get install -y zbar-tools

ADD / /usr/app
RUN ls /usr/app
WORKDIR "/usr/app"

RUN ["npm", "install"]