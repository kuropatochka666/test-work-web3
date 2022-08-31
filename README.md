
## Installation

```bash
$ npm install

$ docker-compose up -d
```

## Running the app

```bash

$ npm run start

http://localhost:3000/api/order - GET, Ордера которые можно сопоставить

http://localhost:3000/api/order - POST, orderMatch 
{
  orderId: string;
  orderId2: string;
}
```


