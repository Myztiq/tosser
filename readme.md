# Tosser

Send your messages from one frame to the other using a simple API which give you ack/nack support.

![Trebuchet](https://cdn3.artstation.com/p/assets/images/images/000/601/179/large/greg-zaal-trebuchet.jpg?1428161639)


## API
 - trigger (type, content = '', callback)
 - broadcast (type, content = '', callback)
 - sendToParent (type, content = '', callback = function () {})
 - sendToChildren (type, content = '', callback = function () {})
 - sendToWindow (type, content = '', targetWindow, callback = function () {})
 - once (type, callback)
 - on (type, callback)
