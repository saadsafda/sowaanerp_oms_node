var net = require("net");
var sockets = [];
const mongoose = require("mongoose");
const Order = require("./models/Order");
const Tables = require("./models/Table");
const ERPNext = require("node-erpnext");
const cron = require("node-cron");
const process = require("process");
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const handleSuccess = require("./HandleFunction/handleSuccess");
const app = express();
const server = require("http").createServer(app);

mongoose.connect("mongodb://127.0.0.1:27017/pos", { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on("open", () => console.log("database connected"));

const erpnext = new ERPNext({
  username: "m.saad@sowaan.com",
  password: "sowaan@123!@#",
  baseUrl: "https://lpt.sowaanerp.com"
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

const broadcastToClients = (message) => {
  sockets.forEach(sock => {
    try {
      sock.write(message + "#dataend\r\n");
    } catch (e) {
      console.error("Failed to send to client", e);
    }
  });
};

net.createServer((socket) => {
  console.log("New TCP client connected");

  // Set a keep-alive timeout to maintain the connection
  socket.setKeepAlive(true, 60000); // 60 seconds

  // Optional: Extend socket timeout to prevent auto-close
  socket.setTimeout(0); // disables timeout

  sockets.push(socket);

  socket.write(JSON.stringify({ connection: "connected" }) + "#connection#dataend\r\n");

  socket.on("data", async (data) => {
    const msg = data.toString();
    console.log("Received TCP data:", msg);

    try {
      const [header, payload] = msg.split("#");
      console.log("Received TCP Header:", header);
      if (header === "GetTables") {
        Tables.find({ occupied: 0 }, (err, docs) => {
          if (!err) {
            socket.write("gotTables#" + JSON.stringify({ message: "Success", data: docs }) + "#dataend\r\n");
          }
        });
      }

      // Handle new order
      else if (header === "Order Creation") {
        const body = JSON.parse(payload);
        const now = new Date();
        now.setHours(now.getHours() + 5);

        const order = {
          ...body,
          Business_date_id: Date.now(),
          order_creation_time: now,
          order_modified_time: now,
          due_date: now,
        };

        Order.create(order, (err, doc) => {
          if (!err) {
            console.log("Order saved from TCP");
            const orderData = {
              id: doc.Business_date_id,
              obId: doc._id,
              orderStatus: doc.sale_invoice_type,
              tableNum: doc.table_num,
              cartItems: JSON.parse(doc.sale_invoice_json_string),
              customerName: doc.customer_name,
              status: doc.sale_invoice_status,
              timeforCalc: doc.order_modified_time,
              creationTime: doc.order_creation_time,
              new: true,
              pos_profile: doc.pos_profile,
              priority: doc.high_priority,
              sale_order_name: doc.sale_order_name ?? '',
              sale_type: doc.sale_type
            };
            broadcastToClients("Order Created#" + JSON.stringify({ message: "Success", data: doc }) + "#dataend\r\n");
            const isForKitchen = ["Pending", "Making", "Baking", "Quality Check", "Ready"].includes(doc.sale_invoice_status);
            if (isForKitchen) {
              broadcastToClients("forKitchenOrder#" + JSON.stringify({ data: [orderData] }) + "#dataend\r\n");
            }
          } else {
            console.error("Order Creation Error", err);
          }
        });
      }

      // Handle cart update
      else if (header === "UpdateCart") {
        const update = JSON.parse(payload);
        const d = new Date();
        d.setHours(d.getHours() + 5);

        const newUpdate = {
          sale_invoice_json_string: JSON.stringify(update.cartItems),
          order_modified_time: d,
          sale_invoice_status: "Making",
          total_billing_amount: update.total_billing_amount,
          base_net_total: update.base_net_total,
          total: update.total,
          net_total: update.net_total,
        };

        Order.findByIdAndUpdate(update.id, newUpdate, { new: true }, (err, doc) => {
          if (!err && doc) {
            console.log("Order updated from TCP");
            broadcastToClients("updateOrderatPOS#" + JSON.stringify({ dataDoc: doc }) + "#dataend\r\n");
          } else {
            console.error("UpdateCart Error", err);
          }
        });
      }
      else if (header === "GetForKitchenOrders") {
        const date1 = new Date();
        const date2 = new Date();
        date1.setUTCHours(0, 0, 0, 0);
        date2.setUTCHours(23, 59, 59, 999);

        Order.find({
          order_creation_time: { $gte: date1, $lte: date2 },
          sale_invoice_status: { $in: ["Pending", "Making", "Baking", "Quality Check", "Ready"] }
        })
          .sort({ order_creation_time: -1 })
          .exec((err, docs) => {
            if (!err && docs.length > 0) {
              const orders = docs.map(doc => ({
                id: doc.Business_date_id,
                obId: doc._id,
                orderStatus: doc.sale_invoice_type,
                tableNum: doc.table_num,
                cartItems: JSON.parse(doc.sale_invoice_json_string),
                customerName: doc.customer_name,
                status: doc.sale_invoice_status,
                timeforCalc: doc.order_modified_time,
                creationTime: doc.order_creation_time,
                new: true,
                pos_profile: doc.pos_profile,
                priority: doc.high_priority,
                sale_order_name: doc.sale_order_name ?? '',
                sale_type: doc.sale_type
              }));
              console.log(orders, "CHecking orders");

              socket.write("forKitchenOrder#" + JSON.stringify({ data: orders }) + "#dataend\r\n");
            }
          });
      }
      else if (header === "ReadyOrder") {
        const { id, cartItems } = JSON.parse(payload);
        const update = {
          sale_invoice_status: "Ready",
          sale_invoice_json_string: JSON.stringify(cartItems),
          order_modified_time: new Date(),
        };
        console.log("Ready Order");


        Order.findByIdAndUpdate(id, update, { new: true }, async (err, doc) => {
          if (err || !doc) {
            console.error("ReadyOrder Update Error", err);
            return;
          }

          // Re-fetch today's orders to broadcast updated state
          const { date1, date2 } = todayDateRange();
          Order.find({
            order_creation_time: { $gte: date1, $lte: date2 }
          }).sort({ order_modified_time: -1 }).exec((err2, docs) => {
            if (err2 || !docs?.length) return;
            const obj = {
              id: doc.Business_date_id,
              obId: doc._id,
              orderStatus: doc.sale_invoice_type,
              tableNum: doc.table_num,
              cartItems: JSON.parse(doc.sale_invoice_json_string),
              customerName: doc.customer_name,
              status: doc.sale_invoice_status,
              timeforCalc: doc.order_modified_time,
              creationTime: doc.order_creation_time,
              new: true,
              pos_profile: doc.pos_profile,
              priority: doc.high_priority,
              sale_order_name: doc.sale_order_name ?? '',
              sale_type: doc.sale_type,
            };

            const payload = JSON.stringify({ data: docs, dataDoc: obj });
            broadcastToClients("readyyOrder#" + payload + "#dataend\r\n");
            // const fullDataPayload = JSON.stringify({ data: docs });
            // socket.write("getData#" + JSON.stringify({ data: docs }) + "#dataend\r\n");
            broadcastToClients("getData#" + JSON.stringify({ data: docs }) + "#dataend\r\n")
          });
        });
      }
      else if (header === "CompletedOrder") {
        const { id, sale_invoice_data, sale_invoice_name, taxes, is_paid, data_sync } = JSON.parse(payload);

        const update = {
          sale_invoice_status: "Completed",
          sale_invoice_data: JSON.stringify(sale_invoice_data),
          sale_invoice_name: sale_invoice_name,
          taxes: JSON.stringify(taxes),
          is_paid: is_paid,
          data_sync: data_sync
        };

        Order.findByIdAndUpdate(id, update, { new: true }, (err, doc) => {
          if (err || !doc) {
            console.error("CompletedOrder Update Error", err);
            return;
          }

          const { date1, date2 } = todayDateRange();
          Order.find({
            order_creation_time: { $gte: date1, $lte: date2 }
          }).sort({ order_modified_time: -1 }).exec((err2, docs) => {
            if (err2 || !docs?.length) return;

            const payload = JSON.stringify({ data: docs, dataDoc: doc });
            broadcastToClients("OrderCompleted#" + payload + "#dataend\r\n");
          });
        });
      }
      else if (header === "Get Today Orders") {
        const { date1, date2 } = todayDateRange();

        Order.find({
          order_creation_time: { $gte: date1, $lte: date2 }
        })
          .sort({ order_creation_time: -1 })
          .exec((err, docs) => {
            if (!err && docs.length > 0) {
              const orders = docs.map(doc => ({
                id: doc.Business_date_id,
                obId: doc._id,
                orderStatus: doc.sale_invoice_type,
                tableNum: doc.table_num,
                cartItems: JSON.parse(doc.sale_invoice_json_string),
                customerName: doc.customer_name,
                status: doc.sale_invoice_status,
                timeforCalc: doc.order_modified_time,
                creationTime: doc.order_creation_time,
                new: true,
                pos_profile: doc.pos_profile,
                priority: doc.high_priority,
                sale_order_name: doc.sale_order_name ?? '',
                sale_type: doc.sale_type
              }));

              socket.write("getData#" + JSON.stringify({ data: orders }) + "#dataend\r\n");

            }
          });
      }





    } catch (err) {
      console.error("TCP Message Handling Error", err);
    }
  });


  socket.on("timeout", () => {
    console.log("Socket timeout");
    socket.destroy(); // cleanup
  });

  socket.on("close", () => {
    console.log("TCP client disconnected");
    sockets = sockets.filter(s => s !== socket);
  });

  socket.on("error", (err) => {
    console.error("TCP client error", err);
    socket.destroy(); // Ensure cleanup
  });
}).listen(8080, () => {
  console.log("TCP server listening on port 8080");
});


process.on("uncaughtException", (err) => {
  console.log("Caught exception:", err);
  process.exit();
});

process.on("exit", () => {
  console.log("Exiting, closing sockets...");
  sockets.forEach(sock => sock.destroy());
});

process.on("SIGINT", () => process.exit());

cron.schedule("*/10 * * * *", () => {
  erpnext.getTables().then(data => {
    data.forEach(item => {
      Tables.findOne({ erp_id: item.name })
        .then(docs => {
          if (!docs) {
            Tables.create({ erp_id: item.name, table_num: item.table_num, occupied: 0 });
          }
        });
    });
  });
});

const todayDateRange = () => {
  const date1 = new Date();
  const date2 = new Date();
  date1.setUTCHours(0, 0, 0, 0);
  date2.setUTCHours(23, 59, 59, 999);
  return { date1, date2 };
};

app.get("/api/getTables", (req, res) => {
  Tables.find({ occupied: 0 }, (err, docs) => {
    if (err) return res.status(500).json({ message: "error", error: err });
    return res.json(handleSuccess(docs));
  });
});

const emitOrderUpdate = (doc, docs, event = "updateOrderatPOS") => {
  const obj = {
    id: doc.Business_date_id,
    obId: doc._id,
    orderStatus: doc.sale_invoice_type,
    tableNum: doc.table_num,
    cartItems: JSON.parse(doc.sale_invoice_json_string),
    customerName: doc.customer_name,
    status: doc.sale_invoice_status,
    timeforCalc: doc.order_modified_time,
    creationTime: doc.order_creation_time,
    new: true,
    pos_profile: doc.pos_profile,
    priority: doc.high_priority,
    sale_order_name: doc.sale_order_name,
    sale_type: doc.sale_type
  };
  const payload = JSON.stringify({ data: docs, dataDoc: obj });
  broadcastToClients(`${event}#${payload}`);
  return { obj, docs };
};

const updateOrderStatus = (req, res, newStatus, event) => {
  const { id, cartItems } = req.body;
  Order.findByIdAndUpdate(id, { sale_invoice_status: newStatus, sale_invoice_json_string: JSON.stringify(cartItems) }, { new: true }, (err, doc) => {
    if (err) return res.status(500).json({ message: "error", error: err });

    const { date1, date2 } = todayDateRange();
    Order.find({ order_creation_time: { $gte: date1, $lte: date2 } }).sort({ order_modified_time: -1 }).exec((err, docs) => {
      if (err || !docs?.length) return res.json({ message: "No Orders", data: [] });
      const { obj } = emitOrderUpdate(doc, docs, event);
      return res.json({ message: "Success", data: docs, dataDoc: obj });
    });
  });
};

app.post("/api/createOrder", (req, res) => {
  let id = 1;
  const { date1, date2 } = todayDateRange();

  Order.find({ order_creation_time: { $gte: date1, $lte: date2 } })
    .sort({ order_creation_time: -1 })
    .exec((err, docs) => {
      if (docs?.length > 0) id = docs[0].Business_date_id + 1;
      const now = new Date();
      now.setHours(now.getHours() + 5);

      const order = { ...req.body, Business_date_id: id, order_creation_time: now, order_modified_time: now, due_date: now };

      Order.create(order, (errr, doc) => {
        if (errr) return res.status(500).json({ message: "Order creation error", error: errr });

        const obj = {
          id: doc.Business_date_id,
          obId: doc._id,
          orderStatus: doc.sale_invoice_type,
          tableNum: doc.table_num,
          cartItems: JSON.parse(doc.sale_invoice_json_string),
          customerName: doc.customer_name,
          status: doc.sale_invoice_status,
          timeforCalc: doc.order_modified_time,
          creationTime: doc.order_creation_time,
          new: true,
          priority: doc.high_priority,
          sale_order_name: doc.sale_order_name,
          sale_type: doc.sale_type
        };

        const payload = JSON.stringify({ message: "Success", data: doc, docData: obj });
        broadcastToClients("Order Created#" + payload);
        broadcastToClients("forKitchenOrder#" + JSON.stringify({ data: [obj] }));

        return res.json({ message: "success", data: doc, docData: obj });
      });
    });
});

app.post("/api/updateOrder", (req, res) => {
  const d = new Date();
  d.setHours(d.getHours() + 5);

  const update = {
    sale_invoice_json_string: JSON.stringify(req.body.cartItems),
    order_modified_time: d,
    sale_invoice_status: "Making",
    total_billing_amount: req.body.total_billing_amount,
    base_net_total: req.body.base_net_total,
    total: req.body.total,
    net_total: req.body.net_total
  };

  Order.findByIdAndUpdate(req.body.id, update, { new: true }, (err, doc) => {
    if (err) return res.status(500).json({ message: "error", error: err });
    const { date1, date2 } = todayDateRange();
    Order.find({ order_creation_time: { $gte: date1, $lte: date2 } }).sort({ order_modified_time: -1 }).exec((err, docs) => {
      if (err || !docs?.length) return res.json({ message: "No Orders", data: [] });
      const { obj } = emitOrderUpdate(doc, docs);
      broadcastToClients("forKitchenOrder#" + JSON.stringify({ data: [obj] }));
      return res.json({ message: "Success", data: docs, dataDoc: obj });
    });
  });
});

app.post("/api/bakeOrder", (req, res) => {
  const hasMakingItems = req.body.cartItems.some(item => item.status === "Making");
  const status = hasMakingItems ? "Making" : "Baking";
  updateOrderStatus(req, res, status, "updateStatusKitchen");
});

app.post("/api/qualityCheck", (req, res) => {
  const hasBakingItems = req.body.cartItems.some(item => item.status === "Baking");
  const status = hasBakingItems ? "Baking" : "Quality Check";
  updateOrderStatus(req, res, status, "updateStatusKitchen");
});

app.post("/api/updatePriority", (req, res) => {
  Order.findByIdAndUpdate(req.body.id, { high_priority: req.body.priority }, { new: true }, (err, doc) => {
    if (err) return res.status(500).json({ message: "error", error: err });
    const { date1, date2 } = todayDateRange();
    Order.find({ order_creation_time: { $gte: date1, $lte: date2 } }).sort({ order_modified_time: -1 }).exec((err, docs) => {
      if (err || !docs?.length) return res.json({ message: "No Orders", data: [] });
      const { obj } = emitOrderUpdate(doc, docs, "updatePriorityKitchen");
      return res.json({ message: "Success", data: docs, dataDoc: obj });
    });
  });
});

app.post("/api/ready", (req, res) => {
  updateOrderStatus(req, res, "Ready", "updateStatusKitchen");
});

app.post("/api/completeOrder", (req, res) => {
  const update = {
    sale_invoice_status: "Completed",
    sale_invoice_data: JSON.stringify(req.body.sale_invoice_data),
    sale_invoice_name: req.body.sale_invoice_name,
    taxes: JSON.stringify(req.body.taxes),
    is_paid: req.body.is_paid,
    data_sync: req.body.data_sync
  };

  Order.findByIdAndUpdate(req.body.id, update, { new: true }, (err, doc) => {
    if (err) return res.status(500).json({ message: "error", error: err });
    const { date1, date2 } = todayDateRange();
    Order.find({ order_creation_time: { $gte: date1, $lte: date2 } }).sort({ order_modified_time: -1 }).exec((err, docs) => {
      if (err || !docs?.length) return res.json({ message: "No Orders", data: [] });
      broadcastToClients("updateOrderatPOS#" + JSON.stringify({ data: docs, dataDoc: doc }));
      return res.json({ message: "Success", data: docs, pos_profile: doc.pos_profile });
    });
  });
});






















// var net = require("net");
// //var pdfcrowd = require("pdfcrowd");
// var sockets = [];
// const mongoose = require("mongoose");
// const Order = require("./models/Order");
// var http = require('http')
// const Tables = require("./models/Table");
// var ERPNext = require("node-erpnext");
// var cron = require("node-cron");
// var process = require('process');
// var cors = require('cors')
// const express = require('express')
// const bodyParser = require('body-parser')
// const handleSuccess = require('./HandleFunction/handleSuccess')
// var app = express();
// var server = http.createServer(app);
// const { Server } = require("socket.io");
// const client = new Server(server, { /* options */ });
// app.use(cors())
// app.use(bodyParser.json())  //Body Parser MiddleWare
// app.use(express.json())

// mongoose.connect("mongodb://127.0.0.1:27017/pos", { useNewUrlParser: true, useUnifiedTopology: true }); //MongoDB connection using Mongoose
// var db = mongoose.connection; //Mongo Connection Instance
// var dt = "";
// var oneTime = 0;
// db.on("open", () => {
//   console.log("database connected");
// });
// var erpnext = new ERPNext({
//   username: 'm.saad@sowaan.com',
//   password: 'sowaan@123!@#',
//   baseUrl: 'https://lpt.sowaanerp.com'
// });


// process.on('uncaughtException', function (err) {
//   console.log('Caught exception: ' + err);
//   process.exit();
// });

// process.on('exit', function (code) {
//   console.log('on exit')
//   sockets.forEach(item => {
//     item.scket.destroy()
//   })
// });
// process.on('SIGINT', function () {
//   process.exit()
// })
// app.get('/api/getTables', (req, res) => {
//   console.log("Request", req);

//   Tables.find({ occupied: 0 }, function (err, docs) {
//     if (err) {
//       console.log(err, "The Error");
//     } else {
//       return res.json(handleSuccess(docs))
//       //console.log("First function call : ", docs);
//     }
//   });
// })
// cron.schedule("*/10 * * * *", () => {
//   erpnext.getTables().then(data => {
//     data.forEach(item => {
//       Tables.findOne({ erp_id: item.name })
//         .then((docs) => {
//           if (docs === null) {
//             const obj = {
//               erp_id: item.name,
//               table_num: item.table_num,
//               occupied: 0
//             }
//             Tables.create(obj, (errr, doc) => {
//               if (errr) {
//                 console.log("Table creationtion error --->", errr);
//                 //Error handling should be done here
//               } else {

//               }
//             })
//           }
//         })
//     })
//   })
// })

// app.post('/api/createOrder', (req, res) => {
//   console.log(typeof req.body)
//   let id = 1;
//   const date1 = new Date();
//   const date2 = new Date();
//   console.log(date1.getDate())
//   console.log(date2.getDate())
//   date1.setUTCDate(date1.getDate())
//   date1.setUTCHours(0);
//   date1.setUTCMinutes(0);
//   date1.setUTCSeconds(0);
//   date1.setUTCMilliseconds(0);
//   date2.setUTCDate(date2.getDate())
//   date2.setUTCHours(23);
//   date2.setUTCMinutes(59);
//   date2.setUTCSeconds(59);
//   date2.setUTCMilliseconds(999);
//   console.log(date1)
//   console.log(date2)
//   Order.find({
//     $and: [
//       { order_creation_time: { $gte: date1 } },
//       { order_creation_time: { $lte: date2 } },
//     ],
//   })
//     .sort({ order_creation_time: -1 })
//     .exec((err, docs) => {
//       if (docs.length > 0) {
//         id = docs[0].Business_date_id + 1;
//       }
//       //let orderString = newData.split("#")[1];
//       //let orderObj = JSON.parse(req.body);
//       let d = new Date();
//       d.setHours(d.getHours() + 5);
//       let order = Object.assign({}, req.body, {
//         Business_date_id: id,
//         order_creation_time: d,
//         order_modified_time: d,
//         due_date: d
//       });
//       console.log("On order creation", order)
//       Order.create(order, (errr, doc) => {
//         if (errr) {
//           console.log("Order creation error --->", errr);
//           //Error handling should be done here
//         } else {
//           var obj = {
//             id: doc.Business_date_id,
//             obId: doc._id,
//             orderStatus: doc.sale_invoice_type,
//             tableNum: doc.table_num,
//             cartItems: JSON.parse(doc.sale_invoice_json_string),
//             customerName: doc.customer_name,
//             status: doc.sale_invoice_status,
//             timeforCalc: doc.order_modified_time,
//             creationTime: doc.order_creation_time,
//             new: true,
//             priority: doc.high_priority,
//             sale_order_name: doc.sale_order_name,
//             sale_type: doc.sale_type

//           };
//           client.emit('sendNormalData', doc)
//           client.emit('sendKitchenData', obj)
//           return res.json({
//             message: 'success',
//             data: doc,
//             docData: obj,
//           })
//           //console.log("order created");
//           // sockets.forEach((socket) => {
//           //   socket.scket.write(
//           //     "Order Created#" +
//           //       JSON.stringify({
//           //         message: "Success",
//           //         data: doc,
//           //         docData: obj,
//           //       }) +
//           //       "#dataend\r\n"
//           //   );
//           // });
//         }
//       });

//     });
// })
// app.post('/api/updateOrder', (req, res) => {
//   let reqDataObj = req.body;
//   let d = new Date();
//   d.setHours(d.getHours() + 5);
//   Order.findByIdAndUpdate(
//     reqDataObj.id,
//     {
//       sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//       order_modified_time: d,
//       sale_invoice_status: "Making",
//       total_billing_amount: reqDataObj.total_billing_amount,
//       base_net_total: reqDataObj.base_net_total,
//       total: reqDataObj.total,
//       net_total: reqDataObj.net_total,
//     },
//     { new: true },
//     function (err, doc) {
//       if (err) {
//         console.log(err);
//       } else {
//         console.log("Updated Order : ", doc);
//         const date1 = new Date();
//         const date2 = new Date();
//         date1.setUTCDate(date1.getDate())

//         date1.setUTCHours(0);
//         date1.setUTCMinutes(0);
//         date1.setUTCSeconds(0);
//         date1.setUTCMilliseconds(0);
//         date2.setUTCDate(date2.getDate())

//         date2.setUTCHours(23);
//         date2.setUTCMinutes(59);
//         date2.setUTCSeconds(59);
//         date2.setUTCMilliseconds(999);

//         Order.find({
//           $and: [
//             { order_creation_time: { $gte: date1 } },
//             { order_creation_time: { $lte: date2 } },
//           ],
//         })
//           .sort({ order_modified_time: -1 })
//           .exec((err, docs) => {
//             if (err) {
//               console.log("Error fetching orders ---> ", err);
//             } else {
//               if (docs.length > 0) {
//                 var obj = {
//                   id: doc.Business_date_id,
//                   obId: doc._id,
//                   orderStatus: doc.sale_invoice_type,
//                   tableNum: doc.table_num,
//                   cartItems: JSON.parse(doc.sale_invoice_json_string),
//                   customerName: doc.customer_name,
//                   status: doc.sale_invoice_status,
//                   timeforCalc: doc.order_modified_time,
//                   creationTime: doc.order_creation_time,
//                   new: true,
//                   pos_profile: doc.pos_profile,
//                   priority: doc.high_priority,
//                   sale_order_name: doc.sale_order_name,
//                   sale_type: doc.sale_type
//                 };
//                 client.emit('updateOrderatPOS', {
//                   data: docs,
//                   dataDoc: obj,
//                 })
//                 client.emit('sendKitchenData', obj)
//                 return res.json({
//                   message: "Success",
//                   data: docs,
//                   dataDoc: obj,
//                 })
//               } else {
//                 return res.json({
//                   message: "No Orders",
//                   data: [],
//                 })
//               }
//             }
//           });
//       }
//     }
//   );
// })
// app.post('/api/bakeOrder', (req, res) => {
//   let reqDataObj = req.body;
//   console.log('data coming', reqDataObj)
//   const filterArray = reqDataObj.cartItems.filter(item => {
//     return item.status === "Making"
//   })
//   console.log(filterArray.length)
//   if (filterArray.length > 0) {
//     Order.findByIdAndUpdate(
//       reqDataObj.id,
//       {
//         sale_invoice_status: "Making",
//         sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//       },
//       { new: true }
//       ,
//       function (err, doc) {
//         if (err) {
//           console.log(err);
//         } else {
//           console.log("Updated Order : ", doc);
//           const date1 = new Date();
//           const date2 = new Date();
//           date1.setUTCDate(date1.getDate())

//           date1.setUTCHours(0);
//           date1.setUTCMinutes(0);
//           date1.setUTCSeconds(0);
//           date1.setUTCMilliseconds(0);
//           date2.setUTCDate(date2.getDate())

//           date2.setUTCHours(23);
//           date2.setUTCMinutes(59);
//           date2.setUTCSeconds(59);
//           date2.setUTCMilliseconds(999);

//           Order.find({
//             $and: [
//               { order_creation_time: { $gte: date1 } },
//               { order_creation_time: { $lte: date2 } },
//             ],
//           })
//             .sort({ order_modified_time: -1 })
//             .exec((err, docs) => {
//               if (err) {
//                 console.log("Error fetching orders ---> ", err);
//               } else {
//                 if (docs.length > 0) {
//                   var obj = {
//                     id: doc.Business_date_id,
//                     obId: doc._id,
//                     orderStatus: doc.sale_invoice_type,
//                     tableNum: doc.table_num,
//                     cartItems: JSON.parse(doc.sale_invoice_json_string),
//                     customerName: doc.customer_name,
//                     status: doc.sale_invoice_status,
//                     timeforCalc: doc.order_modified_time,
//                     creationTime: doc.order_creation_time,
//                     new: true,
//                     pos_profile: doc.pos_profile,
//                     priority: doc.high_priority,
//                     sale_order_name: doc.sale_order_name,
//                     sale_type: doc.sale_type
//                   };
//                   client.emit('updateOrderatPOS', {
//                     data: docs,
//                     dataDoc: obj,
//                   })
//                   client.emit('updateStatusKitchen', obj)
//                   return res.json({
//                     message: "Success",
//                     data: docs,
//                     dataDoc: obj
//                   })
//                 } else {
//                   return res.json({
//                     message: "No Orders",
//                     data: [],
//                   })

//                 }
//               }
//             });
//         }
//       }
//     );
//   }
//   else {
//     Order.findByIdAndUpdate(
//       reqDataObj.id,
//       {
//         sale_invoice_status: "Baking",
//         sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//       },
//       { new: true }
//       ,
//       function (err, doc) {
//         if (err) {
//           console.log(err);
//         } else {
//           console.log("Updated Order : ", doc);
//           const date1 = new Date();
//           const date2 = new Date();
//           date1.setUTCDate(date1.getDate())

//           date1.setUTCHours(0);
//           date1.setUTCMinutes(0);
//           date1.setUTCSeconds(0);
//           date1.setUTCMilliseconds(0);
//           date2.setUTCDate(date2.getDate())

//           date2.setUTCHours(23);
//           date2.setUTCMinutes(59);
//           date2.setUTCSeconds(59);
//           date2.setUTCMilliseconds(999);

//           Order.find({
//             $and: [
//               { order_creation_time: { $gte: date1 } },
//               { order_creation_time: { $lte: date2 } },
//             ],
//           })
//             .sort({ order_modified_time: -1 })
//             .exec((err, docs) => {
//               if (err) {
//                 console.log("Error fetching orders ---> ", err);
//               } else {
//                 if (docs.length > 0) {
//                   var obj = {
//                     id: doc.Business_date_id,
//                     obId: doc._id,
//                     orderStatus: doc.sale_invoice_type,
//                     tableNum: doc.table_num,
//                     cartItems: JSON.parse(doc.sale_invoice_json_string),
//                     customerName: doc.customer_name,
//                     status: doc.sale_invoice_status,
//                     timeforCalc: doc.order_modified_time,
//                     creationTime: doc.order_creation_time,
//                     new: true,
//                     pos_profile: doc.pos_profile,
//                     priority: doc.high_priority,
//                     sale_order_name: doc.sale_order_name,
//                     sale_type: doc.sale_type
//                   };
//                   client.emit('updateOrderatPOS', {
//                     data: docs,
//                     dataDoc: obj,
//                   })
//                   client.emit('updateStatusKitchen', obj)
//                   return res.json({
//                     message: "Success",
//                     data: docs,
//                     dataDoc: obj
//                   })
//                 } else {
//                   return res.json({
//                     message: "No Orders",
//                     data: [],
//                   })
//                 }
//               }
//             });
//         }
//       }
//     );
//   }


// })
// app.post('/api/qualityCheck', (req, res) => {
//   let reqDataObj = req.body;

//   const filterArray = reqDataObj.cartItems.filter(item => {
//     return item.status === "Baking"
//   })
//   if (filterArray.length > 0) {
//     Order.findByIdAndUpdate(
//       reqDataObj.id,
//       {
//         sale_invoice_status: "Baking",
//         sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//       },
//       { new: true }
//       ,
//       function (err, doc) {
//         if (err) {
//           console.log(err);
//         } else {
//           console.log("Updated Order : ", doc);
//           const date1 = new Date();
//           const date2 = new Date();
//           date1.setUTCDate(date1.getDate())

//           date1.setUTCHours(0);
//           date1.setUTCMinutes(0);
//           date1.setUTCSeconds(0);
//           date1.setUTCMilliseconds(0);
//           date2.setUTCDate(date2.getDate())

//           date2.setUTCHours(23);
//           date2.setUTCMinutes(59);
//           date2.setUTCSeconds(59);
//           date2.setUTCMilliseconds(999);

//           Order.find({
//             $and: [
//               { order_creation_time: { $gte: date1 } },
//               { order_creation_time: { $lte: date2 } },
//             ],
//           })
//             .sort({ order_modified_time: -1 })
//             .exec((err, docs) => {
//               if (err) {
//                 console.log("Error fetching orders ---> ", err);
//               } else {
//                 if (docs.length > 0) {
//                   var obj = {
//                     id: doc.Business_date_id,
//                     obId: doc._id,
//                     orderStatus: doc.sale_invoice_type,
//                     tableNum: doc.table_num,
//                     cartItems: JSON.parse(doc.sale_invoice_json_string),
//                     customerName: doc.customer_name,
//                     status: doc.sale_invoice_status,
//                     timeforCalc: doc.order_modified_time,
//                     creationTime: doc.order_creation_time,
//                     new: true,
//                     pos_profile: doc.pos_profile,
//                     priority: doc.high_priority,
//                     sale_order_name: doc.sale_order_name,
//                     sale_type: doc.sale_type
//                   };
//                   client.emit('updateOrderatPOS', {
//                     data: docs,
//                     dataDoc: obj,
//                   })
//                   client.emit('updateStatusKitchen', obj)
//                   return res.json({
//                     message: "Success",
//                     data: docs,
//                     dataDoc: obj
//                   })
//                 } else {
//                   return res.json({
//                     message: "No Orders",
//                     data: [],
//                   })
//                 }
//               }
//             });
//         }
//       }
//     );
//   }
//   else {
//     Order.findByIdAndUpdate(
//       reqDataObj.id,
//       {
//         sale_invoice_status: "Quality Check",
//         sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//       },
//       { new: true }
//       ,
//       function (err, doc) {
//         if (err) {
//           console.log(err);
//         } else {
//           console.log("Updated Order : ", doc);
//           const date1 = new Date();
//           const date2 = new Date();
//           date1.setUTCDate(date1.getDate())

//           date1.setUTCHours(0);
//           date1.setUTCMinutes(0);
//           date1.setUTCSeconds(0);
//           date1.setUTCMilliseconds(0);
//           date2.setUTCDate(date2.getDate())

//           date2.setUTCHours(23);
//           date2.setUTCMinutes(59);
//           date2.setUTCSeconds(59);
//           date2.setUTCMilliseconds(999);

//           Order.find({
//             $and: [
//               { order_creation_time: { $gte: date1 } },
//               { order_creation_time: { $lte: date2 } },
//             ],
//           })
//             .sort({ order_modified_time: -1 })
//             .exec((err, docs) => {
//               if (err) {
//                 console.log("Error fetching orders ---> ", err);
//               } else {
//                 if (docs.length > 0) {
//                   var obj = {
//                     id: doc.Business_date_id,
//                     obId: doc._id,
//                     orderStatus: doc.sale_invoice_type,
//                     tableNum: doc.table_num,
//                     cartItems: JSON.parse(doc.sale_invoice_json_string),
//                     customerName: doc.customer_name,
//                     status: doc.sale_invoice_status,
//                     timeforCalc: doc.order_modified_time,
//                     creationTime: doc.order_creation_time,
//                     new: true,
//                     pos_profile: doc.pos_profile,
//                     priority: doc.high_priority,
//                     sale_order_name: doc.sale_order_name,
//                     sale_type: doc.sale_type
//                   };
//                   client.emit('updateOrderatPOS', {
//                     data: docs,
//                     dataDoc: obj,
//                   })
//                   client.emit('updateStatusKitchen', obj)
//                   return res.json({
//                     message: "Success",
//                     data: docs,
//                     dataDoc: obj
//                   })
//                 } else {


//                   return res.json({
//                     message: "No Orders",
//                     data: [],
//                   })


//                 }
//               }
//             });
//         }
//       }
//     );
//   }

// })
// app.post('/api/updatePriority', (req, res) => {
//   let reqDataObj = req.body
//   Order.findByIdAndUpdate(
//     reqDataObj.id,
//     { high_priority: reqDataObj.priority },
//     { new: true },
//     function (err, doc) {
//       if (err) {
//         console.log(err);
//       } else {
//         console.log("Updated Order : ", doc);
//         const date1 = new Date();
//         const date2 = new Date();
//         date1.setUTCDate(date1.getDate())

//         date1.setUTCHours(0);
//         date1.setUTCMinutes(0);
//         date1.setUTCSeconds(0);
//         date1.setUTCMilliseconds(0);
//         date2.setUTCDate(date2.getDate())

//         date2.setUTCHours(23);
//         date2.setUTCMinutes(59);
//         date2.setUTCSeconds(59);
//         date2.setUTCMilliseconds(999);

//         Order.find({
//           $and: [
//             { order_creation_time: { $gte: date1 } },
//             { order_creation_time: { $lte: date2 } },
//           ],
//         })
//           .sort({ order_modified_time: -1 })
//           .exec((err, docs) => {
//             if (err) {
//               console.log("Error fetching orders ---> ", err);
//             } else {
//               if (docs.length > 0) {
//                 var obj = {
//                   id: doc.Business_date_id,
//                   obId: doc._id,
//                   orderStatus: doc.sale_invoice_type,
//                   tableNum: doc.table_num,
//                   cartItems: JSON.parse(doc.sale_invoice_json_string),
//                   customerName: doc.customer_name,
//                   status: doc.sale_invoice_status,
//                   timeforCalc: doc.order_modified_time,
//                   new: true,
//                   pos_profile: doc.pos_profile,
//                   priority: doc.high_priority,
//                   sale_order_name: doc.sale_order_name,
//                   sale_type: doc.sale_type
//                 };
//                 client.emit('updateOrderatPOS', {
//                   data: docs,
//                   dataDoc: obj,
//                 })
//                 client.emit('updatePriorityKitchen', obj)
//                 return res.json({
//                   message: "Success",
//                   data: docs,
//                   dataDoc: obj,
//                 })
//               } else {
//                 return res.json({
//                   message: "No Orders",
//                   data: [],
//                 })
//               }
//             }
//           });
//       }
//     }
//   );
// })
// app.post('/api/ready', (req, res) => {
//   let reqDataObj = req.body;
//   Order.findByIdAndUpdate(
//     reqDataObj.id,
//     {
//       sale_invoice_status: "Ready",
//       sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//     },
//     { new: true }
//     ,
//     function (err, doc) {
//       if (err) {
//         console.log(err);
//       } else {
//         console.log("Updated Order : ", doc);
//         const date1 = new Date();
//         const date2 = new Date();
//         date1.setUTCDate(date1.getDate())

//         date1.setUTCHours(0);
//         date1.setUTCMinutes(0);
//         date1.setUTCSeconds(0);
//         date1.setUTCMilliseconds(0);
//         date2.setUTCDate(date2.getDate())

//         date2.setUTCHours(23);
//         date2.setUTCMinutes(59);
//         date2.setUTCSeconds(59);
//         date2.setUTCMilliseconds(999);

//         Order.find({
//           $and: [
//             { order_creation_time: { $gte: date1 } },
//             { order_creation_time: { $lte: date2 } },
//           ],
//         })
//           .sort({ order_modified_time: -1 })
//           .exec((err, docs) => {
//             if (err) {
//               console.log("Error fetching orders ---> ", err);
//             } else {
//               if (docs.length > 0) {
//                 var obj = {
//                   id: doc.Business_date_id,
//                   obId: doc._id,
//                   orderStatus: doc.sale_invoice_type,
//                   tableNum: doc.table_num,
//                   cartItems: JSON.parse(doc.sale_invoice_json_string),
//                   customerName: doc.customer_name,
//                   status: doc.sale_invoice_status,
//                   timeforCalc: doc.order_modified_time,
//                   creationTime: doc.order_creation_time,
//                   new: true,
//                   pos_profile: doc.pos_profile,
//                   priority: doc.high_priority,
//                   sale_order_name: doc.sale_order_name,
//                   sale_type: doc.sale_type
//                 };
//                 client.emit('updateOrderatPOS', {
//                   data: docs,
//                   dataDoc: obj,
//                 })
//                 client.emit('updateStatusKitchen', obj)
//                 return res.json({
//                   message: "Success",
//                   data: docs,
//                   dataDoc: obj
//                 })
//               } else {
//                 return res.json({
//                   message: "No Orders",
//                   data: [],
//                 })
//               }
//             }
//           });
//       }
//     }
//   );

// })
// app.post('/api/completeOrder', (req, res) => {
//   let reqDataObj = req.body;
//   Order.findByIdAndUpdate(
//     reqDataObj.id,
//     {
//       sale_invoice_status: "Completed",
//       sale_invoice_data: JSON.stringify(reqDataObj.sale_invoice_data),
//       sale_invoice_name: reqDataObj.sale_invoice_name,
//       taxes: JSON.stringify(reqDataObj.taxes),
//       is_paid: reqDataObj.is_paid,
//       data_sync: reqDataObj.data_sync
//     },
//     { new: true },
//     function (err, doc) {
//       if (err) {
//         console.log(err);
//       } else {
//         const date1 = new Date();
//         const date2 = new Date();
//         date1.setUTCDate(date1.getDate())

//         date1.setUTCHours(0);
//         date1.setUTCMinutes(0);
//         date1.setUTCSeconds(0);
//         date1.setUTCMilliseconds(0);
//         date2.setUTCDate(date2.getDate())

//         date2.setUTCHours(23);
//         date2.setUTCMinutes(59);
//         date2.setUTCSeconds(59);
//         date2.setUTCMilliseconds(999);

//         Order.find({
//           $and: [
//             { order_creation_time: { $gte: date1 } },
//             { order_creation_time: { $lte: date2 } },
//           ],
//         })
//           .sort({ order_modified_time: -1 })
//           .exec((err, docs) => {
//             if (err) {
//               console.log("Error fetching orders ---> ", err);
//             } else {
//               if (docs.length > 0) {
//                 client.emit('updateOrderatPOS', {
//                   data: docs,
//                   dataDoc: doc,
//                 })
//                 return res.json({
//                   message: "Success",
//                   data: docs,
//                   pos_profile: doc.pos_profile
//                 })

//               } else {
//                 return res.json({
//                   message: "No Orders",
//                   data: [],
//                 })
//               }
//             }
//           });
//       }
//     }
//   );

// })
// client.on('connection', (socket) => {
//   console.log('Client connected, ' + socket.id)
//   socket.emit('connecteddd', {
//     message: "hello"
//   });

//   socket.on('getDatahere', (data) => {
//     console.log('Received getDatahere from client:', data);
//   });
// })

// server.listen(8080, function () {
//   console.log("server is listening 8080");
// });