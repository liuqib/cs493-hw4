const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const LODGING = "Lodging";
const GUEST = "Guest";
const BOAT = "Boat";
const LOAD = "Load";

router.use(bodyParser.json());



/* ------------- Begin Lodging Model Functions ------------- */
function post_boat(name, type, length){                                                   //add Boat
  var key = datastore.key(BOAT);
	const new_boat = {"name": name, "type": type, "length": length, "load": null};
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

function get_that_boat(boatID){                                                              //view specified boat
    const key = datastore.key([BOAT, parseInt(boatID,10)]);
    const boatQuery = datastore.createQuery(BOAT).filter('__key__', '=', key);
    return datastore.runQuery(boatQuery).then(results => {
      // console.log(results[0].map(fromDatastore));
      var resultingBoat = results[0].map(ds.fromDatastore);
      if(resultingBoat[0] != null){
        resultingBoat[0].self = "http://localhost:8080/boats/" + boatID;     //needed change
	      return resultingBoat[0];
      }
      else {
        return null;
      }
    });
}

// function get_boats(){                                                              //view all boats
// 	const q = datastore.createQuery(BOAT);
// 	return datastore.runQuery(q).then( (results) => {
//     var resultingBoats = results[0].map(fromDatastore);
//     var i;
//     for (i = 0; i < resultingBoats.length; i++) {
//       resultingBoats[i].self = "http://https://hw3-datastore-liuqib.appspot.com/boats/" + resultingBoats[i].id;         //need change
//     }
//     return resultingBoats;
// 		});
// }

function get_boats(req){                                                            //view all boats
    var q = datastore.createQuery(BOAT).limit(3);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(ds.fromDatastore);
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}

function get_lodging_guests(req, id){
    const key = datastore.key([LODGING, parseInt(id,10)]);
    return datastore.get(key)
    .then( (boats) => {
        const lodging = boats[0];
        const guest_keys = lodging.guests.map( (g_id) => {
            return datastore.key([GUEST, parseInt(g_id,10)]);
        });
        return datastore.get(guest_keys);
    })
    .then((guests) => {
        guests = guests[0].map(ds.fromDatastore);
        return guests;
    });
}

function put_lodging(id, name, description, price){
    const key = datastore.key([LODGING, parseInt(id,10)]);
    const lodging = {"name": name, "description": description, "price": price};
    return datastore.save({"key":key, "data":lodging});
}

function patch_boat(id, name, type, length){                                                  //edit boat
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const updated_boat = {"name": name, "type": type, "length": length};
    return datastore.save({"key":key, "data":updated_boat}).then(() => {return key});
}

function delete_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.delete(key);
}

function put_reservation(lid, gid){
    const l_key = datastore.key([LODGING, parseInt(lid,10)]);
    return datastore.get(l_key)
    .then( (lodging) => {
        if( typeof(lodging[0].guests) === 'undefined'){
            lodging[0].guests = [];
        }
        lodging[0].guests.push(gid);
        return datastore.save({"key":l_key, "data":lodging[0]});
    });

}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/', function(req, res){
    const boats = get_boats(req)
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

router.get('/:id/guests', function(req, res){
    const boats = get_lodging_guests(req, req.params.id)
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

router.get('/:id', function(req, res){                                                 //view specified boat
  const boat = get_that_boat(req.params.id)
	.then( (boat) => {
      if(boat != null){
        res.status(200).json(boat);
      }
      else{
        res.status(404).send({ Error: "No boat with this boat_id exists"});
      }
    });
});

router.post('/', function(req, res){                                                       //add boat
  if (req.body.name && req.body.type && req.body.length) {
    post_boat(req.body.name, req.body.type, req.body.length)
    .then( key => {res.status(201).send('{ "id": ' + key.id + ', "name": "' + req.body.name + '", "type": "' + req.body.type + '", "length": ' + req.body.length + ', "self": "' + "http://localhost:8080/boats/" + key.id +'"}')} );
  }
  else{
    res.status(400).send({ Error: "The request object is missing at least one of the required attributes"});
  }
});

router.put('/:id', function(req, res){
    put_lodging(req.params.id, req.body.name, req.body.description, req.body.price)
    .then(res.status(200).end());
});

router.put('/:lid/guests/:gid', function(req, res){
    put_reservation(req.params.lid, req.params.gid)
    .then(res.status(200).end());
});

// router.delete('/:id', function(req, res){
//     delete_lodging(req.params.id).then(res.status(204).end())
// });

router.delete('/:boatID', function(req, res){                                            //delete boat
  get_that_boat(req.params.boatID).then((result) => {
  if(result == null){
    res.status(404).send({ Error: "No boat with this boat_id exists"});
  }
  else{
     delete_boat(req.params.boatID).then(res.status(204).end());
  }
    });
});

/* ------------- End Controller Functions ------------- */

module.exports = router;
