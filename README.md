## Frame Link ( frame-link )

### Frame Link is a lightweight library that makes two way async communication, between a parent site and iframe, easy.

## !! You have to install the package on both the parent and frame.

## Wrappers

### Using React? try out frame-link-react

## Getting started

### To install

yarn add frame-link

### or

npm i frame-link

## import and initialize with a callback to let you know when is has connected with ( parent / client )

import FrameLink from 'frame-link';

let frameLink;
window.addEventListener('load', () => {
frameLink = FrameLink(ready => {
alert(`frame link connected: ${ready}`)
})
})

## To use

### On iFrame

frameLink.addListener('my-event', (data, callback) => {
console.log('do something with data', data);

    // Here is the helpful bit.
    // it is optional.
    callback && callback({something: 'whatever data I want to send back to parent'})

})

### On the parent

frameLink.postMessage('my-event', {some: 'data'}, (respDataFromIframe) => {
console.log('response from iFrame', respDataFromIframe)
})

### Callbacks are not required, and you can setup one way listners and senders if that better suits your needs.

### iFrame

frameLink.addListener('my-event-from-parent', (data) => {
console.log('do something with data', data);
})

frameLink.postMessage('my-event-from-child', {some: 'data'})

### Parent

frameLink.addListener('my-event-from-child', (data) => {
console.log('do something with data', data);
})

frameLink.postMessage('my-event-from-[arent]', {some: 'data'})

## But.... why.
