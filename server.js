var net = require("net");
//var pdfcrowd = require("pdfcrowd");
var sockets = [];
const mongoose = require("mongoose");
const Order = require("./models/Order");
var http = require('http')
const Tables = require("./models/Table");
var ERPNext = require("node-erpnext");
var cron = require("node-cron");
var process = require('process');
var cors = require('cors')
const express = require('express')
const bodyParser = require('body-parser')
const handleSuccess = require('./HandleFunction/handleSuccess')
var app = express();
var server = http.createServer(app);
const { Server } = require("socket.io");
const client = new Server(server, { /* options */ });
app.use(cors())
app.use(bodyParser.json())  //Body Parser MiddleWare
app.use(express.json())

mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }); //MongoDB connection using Mongoose
var db = mongoose.connection; //Mongo Connection Instance
var dt = "";
var oneTime = 0;
db.on("open", () => {
  console.log("database connected");
});
var erpnext = new ERPNext({
  
});


process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
  process.exit();
});

process.on('exit', function (code) {
  console.log('on exit')
  sockets.forEach(item => {
        item.scket.destroy()
      })
});
process.on('SIGINT', function () {
  process.exit()
})
app.get('/api/getTables',(req, res) => {
    
      Tables.find({ occupied: 0 }, function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        return res.json(handleSuccess(docs))
        //console.log("First function call : ", docs);
      }
    });
        
      
  })
cron.schedule("*/10 * * * *", () => {
  erpnext.getTables().then(data => {
    data.forEach(item => {
      Tables.findOne({ erp_id: item.name })
        .then((docs) => {
          console.log(docs)

          if (docs === null) {
            const obj = {
              erp_id: item.name,
              table_num: item.table_num,
              occupied:0
            }
            Tables.create(obj, (errr, doc) => {
              if (errr) {
                console.log("Table creationtion error --->", errr);
                //Error handling should be done here
              } else {
          
              }
            })
          }
        })
       })
  })
})
// cron.schedule("*/5 * * * *", () => {
//   const date1 = new Date();
//   const date2 = new Date();
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

//   Order.find({
//     $and: [
//       { order_creation_time: { $gte: date1 } },
//       { order_creation_time: { $lte: date2 } },
//       { data_sync: false },
//       { is_paid: true },
//     ],
//   })
//     .sort({ order_creation_time: -1 })
//     .exec((err, docs) => {
//       if (err) {
//         console.log("Error fetching orders ---> ", err);
//       } else {
//         if (docs.length > 0) {
//           docs.forEach(item => {
//             const parseDataofInvoice = JSON.parse(item.sale_invoice_data)
//             erpnext.createSalesInvoice(parseDataofInvoice).then(success => {
//               Order.findByIdAndUpdate(
//                 item._id,
//                 {
//                   sale_invoice_name: success.name,
//                   taxes: JSON.stringify(success.taxes),
//                   data_sync:true
//                 },
//                 function (err, doc) {
//                   if (err) {
//                     console.log(err);
//                   }
//                   else {
                    
//                   }
//                 }
//               );
//             }).catch(err=>console.log('error',err))
//         })
//         } else {
//           console.log("No data");
//         }
//       }
//     });
// });
// cron.schedule("*/1 * * * *", () => {
//   const date1 = new Date();
//   const date2 = new Date();
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

//   Order.find({
//     $and: [
//       { order_creation_time: { $gte: date1 } },
//       { order_creation_time: { $lte: date2 } },
//       { sale_type: true },
//     ],
//   })
//     .sort({ order_creation_time: -1 })
//     .exec((err, docs) => {
//       if (err) {
//         console.log("Error fetching orders ---> ", err);
//       } else {
//         console.log('getting sales order', docs)
//         const newArray = []
//         const dateArray = date1.toISOString().split('T')
//         erpnext.getSalesOrder(dateArray[0]).then(data => {
//           for (var i = 0; i < data.length; i++){
//             const filteredArray = docs.filter(it => {
//               return data[i].name === it.sale_order_name
//        })
//        if (filteredArray.length < 1) {
//          console.log(filteredArray.length)
//          var parseJSON = JSON.parse(data[i].data_for_kitchen)
//          parseJSON.sale_order_name = data[i].name
//          parseJSON.sale_type = true
//          let id = 1;
//          const date1 = new Date();
//          const date2 = new Date();
//          console.log(date1.getDate())
//          console.log(date2.getDate())
//          date1.setUTCDate(date1.getDate())
//          date1.setUTCHours(0);
//          date1.setUTCMinutes(0);
//          date1.setUTCSeconds(0);
//          date1.setUTCMilliseconds(0);
//          date2.setUTCDate(date2.getDate())
//          date2.setUTCHours(23);
//          date2.setUTCMinutes(59);
//          date2.setUTCSeconds(59);
//          date2.setUTCMilliseconds(999);
//          console.log(date1)
//          console.log(date2)
//          Order.find({
//            $and: [
//              { order_creation_time: { $gte: date1 } },
//              { order_creation_time: { $lte: date2 } },
//            ],
//          })
//            .sort({ Business_date_id: -1 })
//            .limit(1)
//            .exec((err, docs) => {
//              console.log('docs',docs.length)
//              if (docs.length > 0) {
//                id = docs[0].Business_date_id + 1;
//              }
//              let d = new Date();
//              d.setHours(d.getHours() + 5);
//              let order = Object.assign({},parseJSON, {
//                Business_date_id: id,
//                order_creation_time: d,
//                order_modified_time: d,
//                due_date:d
//              });
//              console.log("On order creation",order)
//                Order.create(order, (errr, doc) => {
//                  if (errr) {
//                    console.log("Order creation error --->", errr);
//                    //Error handling should be done here
//                  } else {
//                    var obj = {
//                      id: doc.Business_date_id,
//                      obId: doc._id,
//                      orderStatus: doc.sale_invoice_type,
//                      tableNum: doc.table_num,
//                      cartItems: JSON.parse(doc.sale_invoice_json_string),
//                      customerName: doc.customer_name,
//                      status: doc.sale_invoice_status,
//                      timeforCalc: doc.order_modified_time,
//                      creationTime:doc.order_creation_time,
//                      new: true,
//                      priority: doc.high_priority,
//                      sale_order_name: doc.sale_order_name,
//                      sale_type:doc.sale_type
//                    };
//                    console.log("order created");
//                    sockets.forEach((socket) => {
//                      socket.scket.write(
//                        "Order Created#" +
//                          JSON.stringify({
//                            message: "Success",
//                            data: doc,
//                            docData: obj,
//                          }) +
//                          "#dataend\r\n"
//                      );
//                    });
//                  }
//                });
            
//            });
//          //applyOperation('Order Creation#'+JSON.stringify(parseJSON))
//        }
//           }
         
//         })
      
//         // if (docs.length > 0) {
//         //   docs.forEach(item => {
//         //     const parseDataofInvoice = JSON.parse(item.sale_invoice_data)
//         //     erpnext.createSalesInvoice(parseDataofInvoice).then(success => {
//         //       Order.findByIdAndUpdate(
//         //         item._id,
//         //         {
//         //           sale_invoice_name: success.name,
//         //           taxes: JSON.stringify(success.taxes),
//         //           data_sync:true
//         //         },
//         //         function (err, doc) {
//         //           if (err) {
//         //             console.log(err);
//         //           }
//         //           else {
                    
//         //           }
//         //         }
//         //       );
//         //     }).catch(err=>console.log('error',err))
//         // })
//         // } else {
//         //   console.log("No data");
//         // }
//       }
//     });
// });


// var server = net.createServer(function (connection) {
//   connection.on("data", (data) => {
//     var pattern = /dataend/;
//     var newPattern = /connection/;
//     var newData = data.toString();

//     const result = pattern.test(newData);
//     const newResult = newPattern.test(newData);
//     console.log("server side", newData);
//     if (newResult) {
//       sockets.push({
//         scket: connection,
//         ip: connection.remoteAddress.split(":")[3],
//       });
//       //connection.pipe(connection);
//     } else if (result) {
//       console.log("address", connection.remoteAddress.split(":"));
//       dt += newData;

//       if (oneTime > 0) {
//         console.log("server side in dt", dt);

//         applyOperation(dt);
//         dt = "";
//         oneTime = 0;
//       } else {
//         console.log("server side in newData", newData);
//         dt = "";
//         oneTime = 0;
//         applyOperation(newData);

//         // console.log("come on! ", newData);
//       }
//     } else {
//       oneTime = oneTime + 1;
//       dt += newData;
//     }
//   });
//   connection.on("end", function () {
//     console.log("address", connection.remoteAddress.split(":"));
//     console.log("client disconnected");
//   });
//   connection.on("error", (error) => {
//     console.log("address", connection.remoteAddress.split(":"));
//     console.log("error on socket", error);
//   });
//   connection.on("close", function () {
//     // const sock = sockets.filter((item) => {
//     //   return item.ip !== connection.remoteAddress.split(":")[3];
//     // });
//     // sockets = sock;
//     // console.log(sockets);
//     // console.log(sock);
//     console.log("client closed");
//   });
// });
// const applyOperation = (newData) => {
//   const orderCreationPattern = /Order Creation/;
//   const getTodayOrderPattern = /Get Today Orders/;
//   const getTodayOrderPatternForPOSProfile = /Get Today Orders Profile/;
//   const updateCartInDB = /UpdateCart/;
//   const cancelOrder = /CancelOrder/;
//   const readyOrder = /ReadyOrder/;
//   const forKitchen = /ForKitchen/;
//   const completeOrder = /CompletedOrder/;
//   const getTables = /GetTables/;
//   const updatePriority = /UpdatePriority/;
//   const getCloseSales = /getCloseSales/;
//   const makeOrder = /makeOrder/;
//   const bakeOrder = /bakeOrder/;
//  const qualityCheck = /qualityCheck/
//   console.log("data in apply", newData);
//   if (orderCreationPattern.test(newData)) {
//     let id = 1;
//     var now = new Date();
//     const date1 = new Date();
//     const date2 = new Date();
//     console.log(date1.getDate())
//     console.log(date2.getDate())
//     date1.setUTCDate(date1.getDate())
//     date1.setUTCHours(0);
//     date1.setUTCMinutes(0);
//     date1.setUTCSeconds(0);
//     date1.setUTCMilliseconds(0);
//     date2.setUTCDate(date2.getDate())
//     date2.setUTCHours(23);
//     date2.setUTCMinutes(59);
//     date2.setUTCSeconds(59);
//     date2.setUTCMilliseconds(999);
//     console.log(date1)
//     console.log(date2)
//     Order.find({
//       $and: [
//         { order_creation_time: { $gte: date1 } },
//         { order_creation_time: { $lte: date2 } },
//       ],
//     })
//       .sort({ order_creation_time: -1 })
//       .exec((err, docs) => {
//         if (docs.length > 0) {
//           id = docs[0].Business_date_id + 1;
//         }
//         let orderString = newData.split("#")[1];
//         let orderObj = JSON.parse(orderString);
//         let d = new Date();
//         d.setHours(d.getHours() + 5);
//         let order = Object.assign({}, orderObj, {
//           Business_date_id: id,
//           order_creation_time: d,
//           order_modified_time: d,
//           due_date:d
//         });
//         console.log("On order creation",orderObj)
//           Order.create(order, (errr, doc) => {
//             if (errr) {
//               console.log("Order creation error --->", errr);
//               //Error handling should be done here
//             } else {
//               var obj = {
//                 id: doc.Business_date_id,
//                 obId: doc._id,
//                 orderStatus: doc.sale_invoice_type,
//                 tableNum: doc.table_num,
//                 cartItems: JSON.parse(doc.sale_invoice_json_string),
//                 customerName: doc.customer_name,
//                 status: doc.sale_invoice_status,
//                 timeforCalc: doc.order_modified_time,
//                 creationTime:doc.order_creation_time,
//                 new: true,
//                 priority: doc.high_priority,
//                 sale_order_name: doc.sale_order_name,
//                 sale_type:doc.sale_type
                
//               };
//               console.log("order created");
//               sockets.forEach((socket) => {
//                 socket.scket.write(
//                   "Order Created#" +
//                     JSON.stringify({
//                       message: "Success",
//                       data: doc,
//                       docData: obj,
//                     }) +
//                     "#dataend\r\n"
//                 );
//               });
//             }
//           });
       
//       });
//   } else if (getTodayOrderPattern.test(newData)) {
//     const date1 = new Date();
//     const date2 = new Date();
//     date1.setUTCDate(date1.getDate())

//     date1.setUTCHours(0);
//     date1.setUTCMinutes(0);
//     date1.setUTCSeconds(0);
//     date1.setUTCMilliseconds(0);
//     date2.setUTCDate(date2.getDate())

//     date2.setUTCHours(23);
//     date2.setUTCMinutes(59);
//     date2.setUTCSeconds(59);
//     date2.setUTCMilliseconds(999);

//     Order.find({
//       $and: [
//         { order_creation_time: { $gte: date1 } },
//         { order_creation_time: { $lte: date2 } },
//       ],
//     })
//       .sort({ order_creation_time: -1 })
//       .exec((err, docs) => {
//         if (err) {
//           console.log("Error fetching orders ---> ", err);
//         } else {
//           if (docs.length > 0) {
//             sockets.forEach((socket) => {
//               socket.scket.write(
//                 "getData#" +
//                   JSON.stringify({
//                     message: "Success",
//                     data: docs,
//                   }) +
//                   "#dataend\r\n"
//               );
//             });
//           } else {
//             sockets.forEach((socket) => {
//               socket.scket.write(
//                 JSON.stringify({
//                   message: "No Orders",
//                   data: [],
//                 })
//               );
//             });
//           }
//         }
//       });
//   }
//   else if (getCloseSales.test(newData)) {
//     const date1 = new Date();
//     const date2 = new Date();
//     date1.setUTCDate(date1.getDate())

//     date1.setUTCHours(0);
//     date1.setUTCMinutes(0);
//     date1.setUTCSeconds(0);
//     date1.setUTCMilliseconds(0);
//     date2.setUTCDate(date2.getDate())

//     date2.setUTCHours(23);
//     date2.setUTCMinutes(59);
//     date2.setUTCSeconds(59);
//     date2.setUTCMilliseconds(999);

//     Order.find({
//       $and: [
//         { order_creation_time: { $gte: date1 } },
//         { order_creation_time: { $lte: date2 } },
//         { is_paid: true },
//         { data_sync: true }
//       ],
//     })
//       .sort({ order_creation_time: -1 })
//       .exec((err, docs) => {
//         if (err) {
//           console.log("Error fetching orders ---> ", err);
//         } else {
//           if (docs.length > 0) {
//             sockets.forEach((socket) => {
//               socket.scket.write(
//                 "gotCloseSales#" +
//                   JSON.stringify({
//                     message: "Success",
//                     data: docs,
//                   }) +
//                   "#dataend\r\n"
//               );
//             });
//           } else {
//             sockets.forEach((socket) => {
//               socket.scket.write(
//                 JSON.stringify({
//                   message: "No Orders",
//                   data: [],
//                 })
//               );
//             });
//           }
//         }
//       });
//   }
//   else if (completeOrder.test(newData)) {
//     let reqDataString = newData.split("#")[1];
//     let reqDataObj = JSON.parse(reqDataString);
//     Order.findByIdAndUpdate(
//       reqDataObj.id,
//       {
//         sale_invoice_status: "Completed",
//         sale_invoice_data: JSON.stringify(reqDataObj.sale_invoice_data),
//         sale_invoice_name: reqDataObj.sale_invoice_name,
//         taxes: JSON.stringify(reqDataObj.taxes),
//         is_paid: reqDataObj.is_paid,
//         data_sync:reqDataObj.data_sync
//       },
//       { new: true },
//       function (err, doc) {
//         if (err) {
//           console.log(err);
//         } else {
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
//                   sockets.forEach((socket) => {
//                     socket.scket.write(
//                       "OrderCompleted#" +
//                         JSON.stringify({
//                           message: "Success",
//                           data: docs,
//                           pos_profile:doc.pos_profile
//                         }) +
//                         "#dataend\r\n"
//                     );
//                   });
//                 } else {
//                   sockets.forEach((socket) => {
//                     socket.scket.write(
//                       JSON.stringify({
//                         message: "No Orders",
//                         data: [],
//                       })
//                     );
//                   });
//                 }
//               }
//             });
//         }
//       }
//     );
//   } else if (forKitchen.test(newData)) {
//     const date1 = new Date();
//     const date2 = new Date();
//     date1.setUTCHours(0);
//     date1.setUTCMinutes(0);
//     date1.setUTCSeconds(0);
//     date1.setUTCMilliseconds(0);

//     date2.setUTCHours(23);
//     date2.setUTCMinutes(59);
//     date2.setUTCSeconds(59);
//     date2.setUTCMilliseconds(999);

//     Order.find({
//       $and: [
//         { order_creation_time: { $gte: date1 } },
//         { order_creation_time: { $lte: date2 } },
//         { sale_invoice_status: "Making" },
//       ],
//     })
//       .sort({ order_modified_time: -1 })
//       .exec((err, docs) => {
//         if (err) {
//           console.log("Error fetching orders ---> ", err);
//         } else {
//           console.log("data", docs);
//           if (docs.length > 0) {
//             sockets.forEach((socket) => {
//               socket.scket.write(
//                 "forKitchenOrder#" +
//                   JSON.stringify({
//                     message: "Success",
//                     data: docs,
//                   }) +
//                   "#dataend\r\n"
//               );
//             });
//           } else {
//             sockets.forEach((socket) => {
//               socket.scket.write(
//                 JSON.stringify({
//                   message: "No Orders",
//                   data: [],
//                 })
//               );
//             });
//           }
//         }
//       });
//   } else if (updateCartInDB.test(newData)) {
//     let reqDataString = newData.split("#")[1];
//     let reqDataObj = JSON.parse(reqDataString);
//     let d = new Date();
//     d.setHours(d.getHours() + 5);
//     Order.findByIdAndUpdate(
//       reqDataObj.id,
//       {
//         sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//         order_modified_time: d,
//         sale_invoice_status: "Making",
//         total_billing_amount: reqDataObj.total_billing_amount,
//         base_net_total: reqDataObj.base_net_total,
//         total: reqDataObj.total,
//         net_total: reqDataObj.net_total,
//       },
//       { new: true },
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
//                     creationTime:doc.order_creation_time,
//                     new: true,
//                     pos_profile: doc.pos_profile,
//                     priority: doc.high_priority,
//                     sale_order_name: doc.sale_order_name,
//                     sale_type:doc.sale_type
//                   };
//                   sockets.forEach((socket) => {
//                     socket.scket.write(
//                       "UpdatedOrder#" +
//                         JSON.stringify({
//                           message: "Success",
//                           data: docs,
//                           dataDoc: obj,
//                         }) +
//                         "#dataend\r\n"
//                     );
//                   });
//                 } else {
//                   sockets.forEach((socket) => {
//                     socket.scket.write(
//                       JSON.stringify({
//                         message: "No Orders",
//                         data: [],
//                       })
//                     );
//                   });
//                 }
//               }
//             });
//         }
//       }
//     );
//   } else if (cancelOrder.test(newData)) {
//     let reqDataString = newData.split("#")[1];
//     let reqDataObj = JSON.parse(reqDataString);
//     Order.findByIdAndUpdate(
//       reqDataObj.id,
//       {
//         sale_invoice_status: "Cancelled",
//         sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//         cancel_reason: reqDataObj.reason,
//       },
//       {new:true}
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
//                     creationTime:doc.order_creation_time,
//                     new: true,
//                     pos_profile: doc.pos_profile,
//                     priority: doc.high_priority,
//                     sale_order_name: doc.sale_order_name,
//                     sale_type:doc.sale_type
//                   };
//                   sockets.forEach((socket) => {
//                     socket.scket.write(
//                       "cancelledOrder#" +
//                         JSON.stringify({
//                           message: "Success",
//                           data: docs,
//                           dataDoc:obj
//                         }) +
//                         "#dataend\r\n"
//                     );
//                   });
//                 } else {
//                   sockets.forEach((socket) => {
//                     socket.scket.write(
//                       JSON.stringify({
//                         message: "No Orders",
//                         data: [],
//                       })
//                     );
//                   });
//                 }
//               }
//             });
//         }
//       }
//     );
//   } else if (updatePriority.test(newData)) {
//     let reqDataString = newData.split("#")[1];
//     let reqDataObj = JSON.parse(reqDataString);
//     Order.findByIdAndUpdate(
//       reqDataObj.id,
//       { high_priority: reqDataObj.priority },
//       { new: true },
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
//                     new: true,
//                     pos_profile: doc.pos_profile,
//                     priority: doc.high_priority,
//                     sale_order_name: doc.sale_order_name,
//                     sale_type:doc.sale_type
//                   };
//                   sockets.forEach((socket) => {
//                     socket.scket.write(
//                       "PriorityChanged#" +
//                         JSON.stringify({
//                           message: "Success",
//                           data: docs,
//                           dataDoc: obj,
//                         }) +
//                         "#dataend\r\n"
//                     );
//                   });
//                 } else {
//                   sockets.forEach((socket) => {
//                     socket.scket.write(
//                       JSON.stringify({
//                         message: "No Orders",
//                         data: [],
//                       })
//                     );
//                   });
//                 }
//               }
//             });
//         }
//       }
//     );
//   } else if (getTables.test(newData)) {
//     Tables.find({ occupied: 0 }, function (err, docs) {
//       if (err) {
//         console.log(err);
//       } else {
//         sockets.forEach((socket) => {
//           socket.scket.write(
//             "gotTables#" +
//               JSON.stringify({
//                 message: "Success",
//                 data: docs,
//               }) +
//               "#dataend\r\n"
//           );
//         });
//         console.log("First function call : ", docs);
//       }
//     });
//   } else if (readyOrder.test(newData)) {
//     console.log("ready Order", newData);
//     let reqDataString = newData.split("#")[1];
//     let reqDataObj = JSON.parse(reqDataString);
//     Order.findByIdAndUpdate(
//       reqDataObj.id,
//       {
//         sale_invoice_status: "Ready",
//         sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//       },
//       {new:true}
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
//                     creationTime:doc.order_creation_time,
//                     new: true,
//                     pos_profile: doc.pos_profile,
//                     priority: doc.high_priority,
//                     sale_order_name: doc.sale_order_name,
//                     sale_type:doc.sale_type
//                   };
//                   sockets.forEach((socket) => {
//                     socket.scket.write(
//                       "readyyOrder#" +
//                         JSON.stringify({
//                           message: "Success",
//                           data: docs,
//                           dataDoc:obj
//                         }) +
//                         "#dataend\r\n"
//                     );
//                   });
//                 } else {
//                   sockets.forEach((socket) => {
//                     socket.scket.write(
//                       JSON.stringify({
//                         message: "No Orders",
//                         data: [],
//                       })
//                     );
//                   });
//                 }
//               }
//             });
//         }
//       }
//     );
//   }
//   // else if (makeOrder.test(newData)) {
//   //   console.log('make on server')
//   //   let reqDataString = newData.split("#")[1];
//   //   let reqDataObj = JSON.parse(reqDataString);
//   //   console.log('from make order',reqDataObj.cartItems)
//   //   const filterArray = reqDataObj.cartItems.filter(item => {
//   //      return item.status === "Pending"
//   //   })
//   //   if (filterArray.length > 0) {
//   //     Order.findByIdAndUpdate(
//   //       reqDataObj.id,
//   //       {
//   //         sale_invoice_status:"Pending",
//   //         sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//   //       },
//   //       {new:true}
//   //       ,
//   //       function (err, doc) {
//   //         if (err) {
//   //           console.log(err);
//   //         } else {
//   //           console.log("Updated Order : ", doc);
//   //           const date1 = new Date();
//   //           const date2 = new Date();
//   //           date1.setUTCDate(date1.getDate())
  
//   //           date1.setUTCHours(0);
//   //           date1.setUTCMinutes(0);
//   //           date1.setUTCSeconds(0);
//   //           date1.setUTCMilliseconds(0);
//   //           date2.setUTCDate(date2.getDate())
  
//   //           date2.setUTCHours(23);
//   //           date2.setUTCMinutes(59);
//   //           date2.setUTCSeconds(59);
//   //           date2.setUTCMilliseconds(999);
  
//   //           Order.find({
//   //             $and: [
//   //               { order_creation_time: { $gte: date1 } },
//   //               { order_creation_time: { $lte: date2 } },
//   //             ],
//   //           })
//   //             .sort({ order_modified_time: -1 })
//   //             .exec((err, docs) => {
//   //               if (err) {
//   //                 console.log("Error fetching orders ---> ", err);
//   //               } else {
//   //                 if (docs.length > 0) {
//   //                   var obj = {
//   //                     id: doc.Business_date_id,
//   //                     obId: doc._id,
//   //                     orderStatus: doc.sale_invoice_type,
//   //                     tableNum: doc.table_num,
//   //                     cartItems: JSON.parse(doc.sale_invoice_json_string),
//   //                     customerName: doc.customer_name,
//   //                     status: doc.sale_invoice_status,
//   //                     timeforCalc: doc.order_modified_time,
//   //                     creationTime:doc.order_creation_time,
//   //                     new: true,
//   //                     pos_profile: doc.pos_profile,
//   //                     priority: doc.high_priority,
//   //                   };
//   //                   sockets.forEach((socket) => {
//   //                     socket.scket.write(
//   //                       "madeOrder#" +
//   //                         JSON.stringify({
//   //                           message: "Success",
//   //                           data: docs,
//   //                           dataDoc:obj
//   //                         }) +
//   //                         "#dataend\r\n"
//   //                     );
//   //                   });
//   //                 } else {
//   //                   sockets.forEach((socket) => {
//   //                     socket.scket.write(
//   //                       JSON.stringify({
//   //                         message: "No Orders",
//   //                         data: [],
//   //                       })
//   //                     );
//   //                   });
//   //                 }
//   //               }
//   //             });
//   //         }
//   //       }
//   //     );
//   //   }
//   //   else {
//   //     Order.findByIdAndUpdate(
//   //       reqDataObj.id,
//   //       {
//   //         sale_invoice_status:"Making",
//   //         sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//   //       },
//   //       {new:true}
//   //       ,
//   //       function (err, doc) {
//   //         if (err) {
//   //           console.log(err);
//   //         } else {
//   //           console.log("Updated Order : ", doc);
//   //           const date1 = new Date();
//   //           const date2 = new Date();
//   //           date1.setUTCDate(date1.getDate())
  
//   //           date1.setUTCHours(0);
//   //           date1.setUTCMinutes(0);
//   //           date1.setUTCSeconds(0);
//   //           date1.setUTCMilliseconds(0);
//   //           date2.setUTCDate(date2.getDate())
  
//   //           date2.setUTCHours(23);
//   //           date2.setUTCMinutes(59);
//   //           date2.setUTCSeconds(59);
//   //           date2.setUTCMilliseconds(999);
  
//   //           Order.find({
//   //             $and: [
//   //               { order_creation_time: { $gte: date1 } },
//   //               { order_creation_time: { $lte: date2 } },
//   //             ],
//   //           })
//   //             .sort({ order_modified_time: -1 })
//   //             .exec((err, docs) => {
//   //               if (err) {
//   //                 console.log("Error fetching orders ---> ", err);
//   //               } else {
//   //                 if (docs.length > 0) {
//   //                   var obj = {
//   //                     id: doc.Business_date_id,
//   //                     obId: doc._id,
//   //                     orderStatus: doc.sale_invoice_type,
//   //                     tableNum: doc.table_num,
//   //                     cartItems: JSON.parse(doc.sale_invoice_json_string),
//   //                     customerName: doc.customer_name,
//   //                     status: doc.sale_invoice_status,
//   //                     timeforCalc: doc.order_modified_time,
//   //                     creationTime:doc.order_creation_time,
//   //                     new: true,
//   //                     pos_profile: doc.pos_profile,
//   //                     priority: doc.high_priority,
//   //                   };
//   //                   sockets.forEach((socket) => {
//   //                     socket.scket.write(
//   //                       "madeOrder#" +
//   //                         JSON.stringify({
//   //                           message: "Success",
//   //                           data: docs,
//   //                           dataDoc:obj
//   //                         }) +
//   //                         "#dataend\r\n"
//   //                     );
//   //                   });
//   //                 } else {
//   //                   sockets.forEach((socket) => {
//   //                     socket.scket.write(
//   //                       JSON.stringify({
//   //                         message: "No Orders",
//   //                         data: [],
//   //                       })
//   //                     );
//   //                   });
//   //                 }
//   //               }
//   //             });
//   //         }
//   //       }
//   //     );
//   //   }
    
//   // }
//   else if (bakeOrder.test(newData)) {
//     let reqDataString = newData.split("#")[1];
//     let reqDataObj = JSON.parse(reqDataString);
//     const filterArray = reqDataObj.cartItems.filter(item => {
//       return item.status === "Making"
//     })
//     console.log(filterArray.length)
//     if (filterArray.length > 0) {
//       Order.findByIdAndUpdate(
//         reqDataObj.id,
//         {
//           sale_invoice_status:"Making",
//           sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//         },
//         {new:true}
//         ,
//         function (err, doc) {
//           if (err) {
//             console.log(err);
//           } else {
//             console.log("Updated Order : ", doc);
//             const date1 = new Date();
//             const date2 = new Date();
//             date1.setUTCDate(date1.getDate())
  
//             date1.setUTCHours(0);
//             date1.setUTCMinutes(0);
//             date1.setUTCSeconds(0);
//             date1.setUTCMilliseconds(0);
//             date2.setUTCDate(date2.getDate())
  
//             date2.setUTCHours(23);
//             date2.setUTCMinutes(59);
//             date2.setUTCSeconds(59);
//             date2.setUTCMilliseconds(999);
  
//             Order.find({
//               $and: [
//                 { order_creation_time: { $gte: date1 } },
//                 { order_creation_time: { $lte: date2 } },
//               ],
//             })
//               .sort({ order_modified_time: -1 })
//               .exec((err, docs) => {
//                 if (err) {
//                   console.log("Error fetching orders ---> ", err);
//                 } else {
//                   if (docs.length > 0) {
//                     var obj = {
//                       id: doc.Business_date_id,
//                       obId: doc._id,
//                       orderStatus: doc.sale_invoice_type,
//                       tableNum: doc.table_num,
//                       cartItems: JSON.parse(doc.sale_invoice_json_string),
//                       customerName: doc.customer_name,
//                       status: doc.sale_invoice_status,
//                       timeforCalc: doc.order_modified_time,
//                       creationTime:doc.order_creation_time,
//                       new: true,
//                       pos_profile: doc.pos_profile,
//                       priority: doc.high_priority,
//                       sale_order_name: doc.sale_order_name,
//                       sale_type:doc.sale_type
//                     };
//                     sockets.forEach((socket) => {
//                       socket.scket.write(
//                         "bakedOrder#" +
//                           JSON.stringify({
//                             message: "Success",
//                             data: docs,
//                             dataDoc:obj
//                           }) +
//                           "#dataend\r\n"
//                       );
//                     });
//                   } else {
//                     sockets.forEach((socket) => {
//                       socket.scket.write(
//                         JSON.stringify({
//                           message: "No Orders",
//                           data: [],
//                         })
//                       );
//                     });
//                   }
//                 }
//               });
//           }
//         }
//       );
//     }
//     else {
//       Order.findByIdAndUpdate(
//         reqDataObj.id,
//         {
//           sale_invoice_status:"Baking",
//           sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//         },
//         {new:true}
//         ,
//         function (err, doc) {
//           if (err) {
//             console.log(err);
//           } else {
//             console.log("Updated Order : ", doc);
//             const date1 = new Date();
//             const date2 = new Date();
//             date1.setUTCDate(date1.getDate())
  
//             date1.setUTCHours(0);
//             date1.setUTCMinutes(0);
//             date1.setUTCSeconds(0);
//             date1.setUTCMilliseconds(0);
//             date2.setUTCDate(date2.getDate())
  
//             date2.setUTCHours(23);
//             date2.setUTCMinutes(59);
//             date2.setUTCSeconds(59);
//             date2.setUTCMilliseconds(999);
  
//             Order.find({
//               $and: [
//                 { order_creation_time: { $gte: date1 } },
//                 { order_creation_time: { $lte: date2 } },
//               ],
//             })
//               .sort({ order_modified_time: -1 })
//               .exec((err, docs) => {
//                 if (err) {
//                   console.log("Error fetching orders ---> ", err);
//                 } else {
//                   if (docs.length > 0) {
//                     var obj = {
//                       id: doc.Business_date_id,
//                       obId: doc._id,
//                       orderStatus: doc.sale_invoice_type,
//                       tableNum: doc.table_num,
//                       cartItems: JSON.parse(doc.sale_invoice_json_string),
//                       customerName: doc.customer_name,
//                       status: doc.sale_invoice_status,
//                       timeforCalc: doc.order_modified_time,
//                       creationTime:doc.order_creation_time,
//                       new: true,
//                       pos_profile: doc.pos_profile,
//                       priority: doc.high_priority,
//                       sale_order_name: doc.sale_order_name,
//                       sale_type:doc.sale_type
//                     };
//                     sockets.forEach((socket) => {
//                       socket.scket.write(
//                         "bakedOrder#" +
//                           JSON.stringify({
//                             message: "Success",
//                             data: docs,
//                             dataDoc:obj
//                           }) +
//                           "#dataend\r\n"
//                       );
//                     });
//                   } else {
//                     sockets.forEach((socket) => {
//                       socket.scket.write(
//                         JSON.stringify({
//                           message: "No Orders",
//                           data: [],
//                         })
//                       );
//                     });
//                   }
//                 }
//               });
//           }
//         }
//       );
//     }
    
//   }
//   else if (qualityCheck.test(newData)) {
//     let reqDataString = newData.split("#")[1];
//     let reqDataObj = JSON.parse(reqDataString);
//     const filterArray = reqDataObj.cartItems.filter(item => {
//       return item.status === "Baking"
//     })
//     if (filterArray.length > 0) {
//       Order.findByIdAndUpdate(
//         reqDataObj.id,
//         {
//           sale_invoice_status:"Baking",
//           sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//         },
//         {new:true}
//         ,
//         function (err, doc) {
//           if (err) {
//             console.log(err);
//           } else {
//             console.log("Updated Order : ", doc);
//             const date1 = new Date();
//             const date2 = new Date();
//             date1.setUTCDate(date1.getDate())
  
//             date1.setUTCHours(0);
//             date1.setUTCMinutes(0);
//             date1.setUTCSeconds(0);
//             date1.setUTCMilliseconds(0);
//             date2.setUTCDate(date2.getDate())
  
//             date2.setUTCHours(23);
//             date2.setUTCMinutes(59);
//             date2.setUTCSeconds(59);
//             date2.setUTCMilliseconds(999);
  
//             Order.find({
//               $and: [
//                 { order_creation_time: { $gte: date1 } },
//                 { order_creation_time: { $lte: date2 } },
//               ],
//             })
//               .sort({ order_modified_time: -1 })
//               .exec((err, docs) => {
//                 if (err) {
//                   console.log("Error fetching orders ---> ", err);
//                 } else {
//                   if (docs.length > 0) {
//                     var obj = {
//                       id: doc.Business_date_id,
//                       obId: doc._id,
//                       orderStatus: doc.sale_invoice_type,
//                       tableNum: doc.table_num,
//                       cartItems: JSON.parse(doc.sale_invoice_json_string),
//                       customerName: doc.customer_name,
//                       status: doc.sale_invoice_status,
//                       timeforCalc: doc.order_modified_time,
//                       creationTime:doc.order_creation_time,
//                       new: true,
//                       pos_profile: doc.pos_profile,
//                       priority: doc.high_priority,
//                       sale_order_name: doc.sale_order_name,
//                       sale_type:doc.sale_type
//                     };
//                     sockets.forEach((socket) => {
//                       socket.scket.write(
//                         "checkedQuality#" +
//                           JSON.stringify({
//                             message: "Success",
//                             data: docs,
//                             dataDoc:obj
//                           }) +
//                           "#dataend\r\n"
//                       );
//                     });
//                   } else {
//                     sockets.forEach((socket) => {
//                       socket.scket.write(
//                         JSON.stringify({
//                           message: "No Orders",
//                           data: [],
//                         })
//                       );
//                     });
//                   }
//                 }
//               });
//           }
//         }
//       );
//     }
//     else {
//       Order.findByIdAndUpdate(
//         reqDataObj.id,
//         {
//           sale_invoice_status:"Quality Check",
//           sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
//         },
//         {new:true}
//         ,
//         function (err, doc) {
//           if (err) {
//             console.log(err);
//           } else {
//             console.log("Updated Order : ", doc);
//             const date1 = new Date();
//             const date2 = new Date();
//             date1.setUTCDate(date1.getDate())
  
//             date1.setUTCHours(0);
//             date1.setUTCMinutes(0);
//             date1.setUTCSeconds(0);
//             date1.setUTCMilliseconds(0);
//             date2.setUTCDate(date2.getDate())
  
//             date2.setUTCHours(23);
//             date2.setUTCMinutes(59);
//             date2.setUTCSeconds(59);
//             date2.setUTCMilliseconds(999);
  
//             Order.find({
//               $and: [
//                 { order_creation_time: { $gte: date1 } },
//                 { order_creation_time: { $lte: date2 } },
//               ],
//             })
//               .sort({ order_modified_time: -1 })
//               .exec((err, docs) => {
//                 if (err) {
//                   console.log("Error fetching orders ---> ", err);
//                 } else {
//                   if (docs.length > 0) {
//                     var obj = {
//                       id: doc.Business_date_id,
//                       obId: doc._id,
//                       orderStatus: doc.sale_invoice_type,
//                       tableNum: doc.table_num,
//                       cartItems: JSON.parse(doc.sale_invoice_json_string),
//                       customerName: doc.customer_name,
//                       status: doc.sale_invoice_status,
//                       timeforCalc: doc.order_modified_time,
//                       creationTime:doc.order_creation_time,
//                       new: true,
//                       pos_profile: doc.pos_profile,
//                       priority: doc.high_priority,
//                       sale_order_name: doc.sale_order_name,
//                       sale_type:doc.sale_type
//                     };
//                     sockets.forEach((socket) => {
//                       socket.scket.write(
//                         "checkedQuality#" +
//                           JSON.stringify({
//                             message: "Success",
//                             data: docs,
//                             dataDoc:obj
//                           }) +
//                           "#dataend\r\n"
//                       );
//                     });
//                   } else {
//                     sockets.forEach((socket) => {
//                       socket.scket.write(
//                         JSON.stringify({
//                           message: "No Orders",
//                           data: [],
//                         })
//                       );
//                     });
//                   }
//                 }
//               });
//           }
//         }
//       );
//     }
//   }
//   else if (getTodayOrderPatternForPOSProfile.test(newData)) {
//     //Get orders for specific POS profile
//     let reqDataString = newData.split("#")[0];
//     let reqDataObj = JSON.parse(reqDataString);
//     let pos_profile = reqDataObj.pos_profile;
//     if (pos_profile !== undefined && pos_profile !== null) {
//       const date1 = new Date();
//       const date2 = new Date();
//       date1.setUTCHours(0);
//       date1.setUTCMinutes(0);
//       date1.setUTCSeconds(0);
//       date1.setUTCMilliseconds(0);

//       date2.setUTCHours(23);
//       date2.setUTCMinutes(59);
//       date2.setUTCSeconds(59);
//       date2.setUTCMilliseconds(999);

//       Order.find({
//         $and: [
//           { order_creation_time: { $gte: date1 } },
//           { order_creation_time: { $lte: date2 } },
//           { pos_profile },
//         ],
//       })
//         .sort({ order_creation_time: -1 })
//         .exec((err, docs) => {
//           if (err) {
//             console.log("Error fetching orders ---> ", err);
//           } else {
//             if (docs.length > 0) {
//               sockets.forEach((socket) => {
//                 socket.scket.write(
//                   JSON.stringify({
//                     message: "Success",
//                     data: docs,
//                   })
//                 );
//               });
//             } else {
//               sockets.forEach((socket) => {
//                 socket.scket.write(
//                   JSON.stringify({
//                     message: "No Orders",
//                     data: [],
//                   })
//                 );
//               });
//             }
//           }
//         });
//     } else {
//       console.log("POS profile can not be null");
//     }
//   } else {
//     console.log("No operation can be done");
//   }
// };

app.post('/api/createOrder', (req, res) => {
  console.log(typeof req.body)
  let id = 1;
      const date1 = new Date();
      const date2 = new Date();
      console.log(date1.getDate())
      console.log(date2.getDate())
      date1.setUTCDate(date1.getDate())
      date1.setUTCHours(0);
      date1.setUTCMinutes(0);
      date1.setUTCSeconds(0);
      date1.setUTCMilliseconds(0);
      date2.setUTCDate(date2.getDate())
      date2.setUTCHours(23);
      date2.setUTCMinutes(59);
      date2.setUTCSeconds(59);
      date2.setUTCMilliseconds(999);
      console.log(date1)
      console.log(date2)
      Order.find({
        $and: [
          { order_creation_time: { $gte: date1 } },
          { order_creation_time: { $lte: date2 } },
        ],
      })
        .sort({ order_creation_time: -1 })
        .exec((err, docs) => {
          if (docs.length > 0) {
            id = docs[0].Business_date_id + 1;
          }
          //let orderString = newData.split("#")[1];
          //let orderObj = JSON.parse(req.body);
          let d = new Date();
          d.setHours(d.getHours() + 5);
          let order = Object.assign({},req.body, {
            Business_date_id: id,
            order_creation_time: d,
            order_modified_time: d,
            due_date:d
          });
          console.log("On order creation",order)
            Order.create(order, (errr, doc) => {
              if (errr) {
                console.log("Order creation error --->", errr);
                //Error handling should be done here
              } else {
                var obj = {
                  id: doc.Business_date_id,
                  obId: doc._id,
                  orderStatus: doc.sale_invoice_type,
                  tableNum: doc.table_num,
                  cartItems: JSON.parse(doc.sale_invoice_json_string),
                  customerName: doc.customer_name,
                  status: doc.sale_invoice_status,
                  timeforCalc: doc.order_modified_time,
                  creationTime:doc.order_creation_time,
                  new: true,
                  priority: doc.high_priority,
                  sale_order_name: doc.sale_order_name,
                  sale_type:doc.sale_type
                  
                };
                client.emit('sendNormalData',doc)
                client.emit('sendKitchenData',obj)
                return res.json({
                  message: 'success',
                  data: doc,
                  docData: obj,
                })
                //console.log("order created");
                // sockets.forEach((socket) => {
                //   socket.scket.write(
                //     "Order Created#" +
                //       JSON.stringify({
                //         message: "Success",
                //         data: doc,
                //         docData: obj,
                //       }) +
                //       "#dataend\r\n"
                //   );
                // });
              }
            });
         
        });
})
app.post('/api/updateOrder', (req, res) => {
      let reqDataObj = req.body;
    let d = new Date();
    d.setHours(d.getHours() + 5);
    Order.findByIdAndUpdate(
      reqDataObj.id,
      {
        sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
        order_modified_time: d,
        sale_invoice_status: "Making",
        total_billing_amount: reqDataObj.total_billing_amount,
        base_net_total: reqDataObj.base_net_total,
        total: reqDataObj.total,
        net_total: reqDataObj.net_total,
      },
      { new: true },
      function (err, doc) {
        if (err) {
          console.log(err);
        } else {
          console.log("Updated Order : ", doc);
          const date1 = new Date();
          const date2 = new Date();
          date1.setUTCDate(date1.getDate())

          date1.setUTCHours(0);
          date1.setUTCMinutes(0);
          date1.setUTCSeconds(0);
          date1.setUTCMilliseconds(0);
          date2.setUTCDate(date2.getDate())

          date2.setUTCHours(23);
          date2.setUTCMinutes(59);
          date2.setUTCSeconds(59);
          date2.setUTCMilliseconds(999);

          Order.find({
            $and: [
              { order_creation_time: { $gte: date1 } },
              { order_creation_time: { $lte: date2 } },
            ],
          })
            .sort({ order_modified_time: -1 })
            .exec((err, docs) => {
              if (err) {
                console.log("Error fetching orders ---> ", err);
              } else {
                if (docs.length > 0) {
                  var obj = {
                    id: doc.Business_date_id,
                    obId: doc._id,
                    orderStatus: doc.sale_invoice_type,
                    tableNum: doc.table_num,
                    cartItems: JSON.parse(doc.sale_invoice_json_string),
                    customerName: doc.customer_name,
                    status: doc.sale_invoice_status,
                    timeforCalc: doc.order_modified_time,
                    creationTime:doc.order_creation_time,
                    new: true,
                    pos_profile: doc.pos_profile,
                    priority: doc.high_priority,
                    sale_order_name: doc.sale_order_name,
                    sale_type:doc.sale_type
                  };
                  client.emit('updateOrderatPOS', {
                    data: docs,
                    dataDoc: obj,
                  })
                  client.emit('sendKitchenData',obj)
                  return res.json({
                    message: "Success",
                    data: docs,
                    dataDoc: obj,
                  })
                } else {
                  return res.json({
                    message: "No Orders",
                    data: [],
                  })
                }
              }
            });
        }
      }
    );
})
app.post('/api/bakeOrder', (req, res) => {
  let reqDataObj = req.body;
  console.log('data coming',reqDataObj)
    const filterArray = reqDataObj.cartItems.filter(item => {
      return item.status === "Making"
    })
    console.log(filterArray.length)
    if (filterArray.length > 0) {
      Order.findByIdAndUpdate(
        reqDataObj.id,
        {
          sale_invoice_status:"Making",
          sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
        },
        {new:true}
        ,
        function (err, doc) {
          if (err) {
            console.log(err);
          } else {
            console.log("Updated Order : ", doc);
            const date1 = new Date();
            const date2 = new Date();
            date1.setUTCDate(date1.getDate())
  
            date1.setUTCHours(0);
            date1.setUTCMinutes(0);
            date1.setUTCSeconds(0);
            date1.setUTCMilliseconds(0);
            date2.setUTCDate(date2.getDate())
  
            date2.setUTCHours(23);
            date2.setUTCMinutes(59);
            date2.setUTCSeconds(59);
            date2.setUTCMilliseconds(999);
  
            Order.find({
              $and: [
                { order_creation_time: { $gte: date1 } },
                { order_creation_time: { $lte: date2 } },
              ],
            })
              .sort({ order_modified_time: -1 })
              .exec((err, docs) => {
                if (err) {
                  console.log("Error fetching orders ---> ", err);
                } else {
                  if (docs.length > 0) {
                    var obj = {
                      id: doc.Business_date_id,
                      obId: doc._id,
                      orderStatus: doc.sale_invoice_type,
                      tableNum: doc.table_num,
                      cartItems: JSON.parse(doc.sale_invoice_json_string),
                      customerName: doc.customer_name,
                      status: doc.sale_invoice_status,
                      timeforCalc: doc.order_modified_time,
                      creationTime:doc.order_creation_time,
                      new: true,
                      pos_profile: doc.pos_profile,
                      priority: doc.high_priority,
                      sale_order_name: doc.sale_order_name,
                      sale_type:doc.sale_type
                    };
                    client.emit('updateOrderatPOS', {
                      data: docs,
                      dataDoc: obj,
                    })
                    client.emit('updateStatusKitchen',obj)
                    return res.json({
                        message: "Success",
                        data: docs,
                        dataDoc:obj
                      })
                  } else {
                    return res.json({
                      message: "No Orders",
                      data: [],
                    })
                  
                  }
                }
              });
          }
        }
      );
    }
    else {
      Order.findByIdAndUpdate(
        reqDataObj.id,
        {
          sale_invoice_status:"Baking",
          sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
        },
        {new:true}
        ,
        function (err, doc) {
          if (err) {
            console.log(err);
          } else {
            console.log("Updated Order : ", doc);
            const date1 = new Date();
            const date2 = new Date();
            date1.setUTCDate(date1.getDate())
  
            date1.setUTCHours(0);
            date1.setUTCMinutes(0);
            date1.setUTCSeconds(0);
            date1.setUTCMilliseconds(0);
            date2.setUTCDate(date2.getDate())
  
            date2.setUTCHours(23);
            date2.setUTCMinutes(59);
            date2.setUTCSeconds(59);
            date2.setUTCMilliseconds(999);
  
            Order.find({
              $and: [
                { order_creation_time: { $gte: date1 } },
                { order_creation_time: { $lte: date2 } },
              ],
            })
              .sort({ order_modified_time: -1 })
              .exec((err, docs) => {
                if (err) {
                  console.log("Error fetching orders ---> ", err);
                } else {
                  if (docs.length > 0) {
                    var obj = {
                      id: doc.Business_date_id,
                      obId: doc._id,
                      orderStatus: doc.sale_invoice_type,
                      tableNum: doc.table_num,
                      cartItems: JSON.parse(doc.sale_invoice_json_string),
                      customerName: doc.customer_name,
                      status: doc.sale_invoice_status,
                      timeforCalc: doc.order_modified_time,
                      creationTime:doc.order_creation_time,
                      new: true,
                      pos_profile: doc.pos_profile,
                      priority: doc.high_priority,
                      sale_order_name: doc.sale_order_name,
                      sale_type:doc.sale_type
                    };
                    client.emit('updateOrderatPOS', {
                      data: docs,
                      dataDoc: obj,
                    })
                    client.emit('updateStatusKitchen',obj)
                    return res.json({
                        message: "Success",
                        data: docs,
                        dataDoc:obj
                      })
                  } else {
                    return res.json({
                      message: "No Orders",
                      data: [],
                    })
                  } 
                }
              });
          }
        }
      );
    }
    

})
app.post('/api/qualityCheck', (req, res) => {
  let reqDataObj = req.body;
  
    const filterArray = reqDataObj.cartItems.filter(item => {
      return item.status === "Baking"
    })
    if (filterArray.length > 0) {
      Order.findByIdAndUpdate(
        reqDataObj.id,
        {
          sale_invoice_status:"Baking",
          sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
        },
        {new:true}
        ,
        function (err, doc) {
          if (err) {
            console.log(err);
          } else {
            console.log("Updated Order : ", doc);
            const date1 = new Date();
            const date2 = new Date();
            date1.setUTCDate(date1.getDate())
  
            date1.setUTCHours(0);
            date1.setUTCMinutes(0);
            date1.setUTCSeconds(0);
            date1.setUTCMilliseconds(0);
            date2.setUTCDate(date2.getDate())
  
            date2.setUTCHours(23);
            date2.setUTCMinutes(59);
            date2.setUTCSeconds(59);
            date2.setUTCMilliseconds(999);
  
            Order.find({
              $and: [
                { order_creation_time: { $gte: date1 } },
                { order_creation_time: { $lte: date2 } },
              ],
            })
              .sort({ order_modified_time: -1 })
              .exec((err, docs) => {
                if (err) {
                  console.log("Error fetching orders ---> ", err);
                } else {
                  if (docs.length > 0) {
                    var obj = {
                      id: doc.Business_date_id,
                      obId: doc._id,
                      orderStatus: doc.sale_invoice_type,
                      tableNum: doc.table_num,
                      cartItems: JSON.parse(doc.sale_invoice_json_string),
                      customerName: doc.customer_name,
                      status: doc.sale_invoice_status,
                      timeforCalc: doc.order_modified_time,
                      creationTime:doc.order_creation_time,
                      new: true,
                      pos_profile: doc.pos_profile,
                      priority: doc.high_priority,
                      sale_order_name: doc.sale_order_name,
                      sale_type:doc.sale_type
                    };
                    client.emit('updateOrderatPOS', {
                      data: docs,
                      dataDoc: obj,
                    })
                    client.emit('updateStatusKitchen',obj)
                    return res.json({
                        message: "Success",
                        data: docs,
                        dataDoc:obj
                      })
                  } else {
                    return res.json({
                      message: "No Orders",
                      data: [],
                    })
                  }
                }
              });
          }
        }
      );
    }
    else {
      Order.findByIdAndUpdate(
        reqDataObj.id,
        {
          sale_invoice_status:"Quality Check",
          sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
        },
        {new:true}
        ,
        function (err, doc) {
          if (err) {
            console.log(err);
          } else {
            console.log("Updated Order : ", doc);
            const date1 = new Date();
            const date2 = new Date();
            date1.setUTCDate(date1.getDate())
  
            date1.setUTCHours(0);
            date1.setUTCMinutes(0);
            date1.setUTCSeconds(0);
            date1.setUTCMilliseconds(0);
            date2.setUTCDate(date2.getDate())
  
            date2.setUTCHours(23);
            date2.setUTCMinutes(59);
            date2.setUTCSeconds(59);
            date2.setUTCMilliseconds(999);
  
            Order.find({
              $and: [
                { order_creation_time: { $gte: date1 } },
                { order_creation_time: { $lte: date2 } },
              ],
            })
              .sort({ order_modified_time: -1 })
              .exec((err, docs) => {
                if (err) {
                  console.log("Error fetching orders ---> ", err);
                } else {
                  if (docs.length > 0) {
                    var obj = {
                      id: doc.Business_date_id,
                      obId: doc._id,
                      orderStatus: doc.sale_invoice_type,
                      tableNum: doc.table_num,
                      cartItems: JSON.parse(doc.sale_invoice_json_string),
                      customerName: doc.customer_name,
                      status: doc.sale_invoice_status,
                      timeforCalc: doc.order_modified_time,
                      creationTime:doc.order_creation_time,
                      new: true,
                      pos_profile: doc.pos_profile,
                      priority: doc.high_priority,
                      sale_order_name: doc.sale_order_name,
                      sale_type:doc.sale_type
                    };
                    client.emit('updateOrderatPOS',{
                      data: docs,
                      dataDoc: obj,
                    })
                    client.emit('updateStatusKitchen',obj)
                    return res.json({
                        message: "Success",
                        data: docs,
                        dataDoc:obj
                      })
                  } else {
                  
                  
                        return res.json({
                          message: "No Orders",
                          data: [],
                        })
                    
              
                  }
                }
              });
          }
        }
      );
    }

})
app.post('/api/updatePriority', (req, res) => {
    let reqDataObj =req.body
    Order.findByIdAndUpdate(
      reqDataObj.id,
      { high_priority: reqDataObj.priority },
      { new: true },
      function (err, doc) {
        if (err) {
          console.log(err);
        } else {
          console.log("Updated Order : ", doc);
          const date1 = new Date();
          const date2 = new Date();
          date1.setUTCDate(date1.getDate())

          date1.setUTCHours(0);
          date1.setUTCMinutes(0);
          date1.setUTCSeconds(0);
          date1.setUTCMilliseconds(0);
          date2.setUTCDate(date2.getDate())

          date2.setUTCHours(23);
          date2.setUTCMinutes(59);
          date2.setUTCSeconds(59);
          date2.setUTCMilliseconds(999);

          Order.find({
            $and: [
              { order_creation_time: { $gte: date1 } },
              { order_creation_time: { $lte: date2 } },
            ],
          })
            .sort({ order_modified_time: -1 })
            .exec((err, docs) => {
              if (err) {
                console.log("Error fetching orders ---> ", err);
              } else {
                if (docs.length > 0) {
                  var obj = {
                    id: doc.Business_date_id,
                    obId: doc._id,
                    orderStatus: doc.sale_invoice_type,
                    tableNum: doc.table_num,
                    cartItems: JSON.parse(doc.sale_invoice_json_string),
                    customerName: doc.customer_name,
                    status: doc.sale_invoice_status,
                    timeforCalc: doc.order_modified_time,
                    new: true,
                    pos_profile: doc.pos_profile,
                    priority: doc.high_priority,
                    sale_order_name: doc.sale_order_name,
                    sale_type:doc.sale_type
                  };
                  client.emit('updateOrderatPOS',{
                    data: docs,
                    dataDoc: obj,
                  })
                client.emit('updatePriorityKitchen',obj)
                   return res.json({
                    message: "Success",
                    data: docs,
                    dataDoc: obj,
                  })
                } else {
                    return res.json({
                      message: "No Orders",
                      data: [],
                    })
                }
              }
            });
        }
      }
    );
})
app.post('/api/ready', (req, res) => {
    let reqDataObj = req.body;
    Order.findByIdAndUpdate(
      reqDataObj.id,
      {
        sale_invoice_status: "Ready",
        sale_invoice_json_string: JSON.stringify(reqDataObj.cartItems),
      },
      {new:true}
      ,
      function (err, doc) {
        if (err) {
          console.log(err);
        } else {
          console.log("Updated Order : ", doc);
          const date1 = new Date();
          const date2 = new Date();
          date1.setUTCDate(date1.getDate())

          date1.setUTCHours(0);
          date1.setUTCMinutes(0);
          date1.setUTCSeconds(0);
          date1.setUTCMilliseconds(0);
          date2.setUTCDate(date2.getDate())

          date2.setUTCHours(23);
          date2.setUTCMinutes(59);
          date2.setUTCSeconds(59);
          date2.setUTCMilliseconds(999);

          Order.find({
            $and: [
              { order_creation_time: { $gte: date1 } },
              { order_creation_time: { $lte: date2 } },
            ],
          })
            .sort({ order_modified_time: -1 })
            .exec((err, docs) => {
              if (err) {
                console.log("Error fetching orders ---> ", err);
              } else {
                if (docs.length > 0) {
                  var obj = {
                    id: doc.Business_date_id,
                    obId: doc._id,
                    orderStatus: doc.sale_invoice_type,
                    tableNum: doc.table_num,
                    cartItems: JSON.parse(doc.sale_invoice_json_string),
                    customerName: doc.customer_name,
                    status: doc.sale_invoice_status,
                    timeforCalc: doc.order_modified_time,
                    creationTime:doc.order_creation_time,
                    new: true,
                    pos_profile: doc.pos_profile,
                    priority: doc.high_priority,
                    sale_order_name: doc.sale_order_name,
                    sale_type:doc.sale_type
                  };
                  client.emit('updateOrderatPOS',{
                    data: docs,
                    dataDoc: obj,
                  })
                  client.emit('updateStatusKitchen',obj)
                  return res.json({
                      message: "Success",
                      data: docs,
                      dataDoc:obj
                    })
                } else {
                   return res.json({
                    message: "No Orders",
                    data: [],
                  })
                }
              }
            });
        }
      }
    );

})
app.post('/api/completeOrder', (req, res) => {
      let reqDataObj = req.body;
    Order.findByIdAndUpdate(
      reqDataObj.id,
      {
        sale_invoice_status: "Completed",
        sale_invoice_data: JSON.stringify(reqDataObj.sale_invoice_data),
        sale_invoice_name: reqDataObj.sale_invoice_name,
        taxes: JSON.stringify(reqDataObj.taxes),
        is_paid: reqDataObj.is_paid,
        data_sync:reqDataObj.data_sync
      },
      { new: true },
      function (err, doc) {
        if (err) {
          console.log(err);
        } else {
          const date1 = new Date();
          const date2 = new Date();
          date1.setUTCDate(date1.getDate())

          date1.setUTCHours(0);
          date1.setUTCMinutes(0);
          date1.setUTCSeconds(0);
          date1.setUTCMilliseconds(0);
          date2.setUTCDate(date2.getDate())

          date2.setUTCHours(23);
          date2.setUTCMinutes(59);
          date2.setUTCSeconds(59);
          date2.setUTCMilliseconds(999);

          Order.find({
            $and: [
              { order_creation_time: { $gte: date1 } },
              { order_creation_time: { $lte: date2 } },
            ],
          })
            .sort({ order_modified_time: -1 })
            .exec((err, docs) => {
              if (err) {
                console.log("Error fetching orders ---> ", err);
              } else {
                if (docs.length > 0) {
                  client.emit('updateOrderatPOS',{
                    data: docs,
                    dataDoc:doc,
                  })
                  return res.json({
                     message: "Success",
                    data: docs,
                    pos_profile:doc.pos_profile
                  })
                 
                } else {
                  return res.json({
                    message: "No Orders",
                    data: [],
                  })
                }
              }
            });
        }
      }
    );

})
client.on('connection', (socket) => {
  console.log('Client connected'+socket.id)
  client.emit('connecteddd', {
    message: "hello"
  })
  socket.on('getDatahere', (data) => {
    console.log(data)
  })
})


server.listen(8080, function () {
  console.log("server is listening 8080");
});
// app.listen(8080, function () {
//  console.log("server is listening 8080");
//  });