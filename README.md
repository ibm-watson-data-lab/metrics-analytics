## Metrics Analytics

This project is related to the metrics-collector project ([metrics-collector](https://github.com/ibm-cds-labs/metrics-collector)) which is a simple service for capture user interaction events and store them in a Cloudant database.
Metrics Analytics is a couch app application that provides simple but powerful visualizations on the user data collected by the metrics-collector application. It is implemented using [d3](http://d3js.org/), [angular](https://angularjs.org) and [bootstrap](http://getbootstrap.com/).

**By using these 2 projects, you can easily instrument your application to track how your users use it and get powerful reports on the data**

User tasks:  
*  Select the application you want to view reports on. Applications are identified by a unique id which is included in the tracking scrip tag. e.g:  
`
<script src="http://metrics-collector.domainname/tracker.js" siteid="my.app.id"></script>
`  
* Use the button bar to select the type of visualization for the data:  
	* Bar Chart  
	* Pie Chart  
	* Line Chart  
	* Table 
* Use the combo-box to select a query from the list of built-in queries.   	*  By Total Events
	*  By Search Category  
	Note for developers: if you don't find a built-in query that fits your needs, it is very simple to add your own by editing the app/app.js file:
``` javascript  
//Add JSON object to the following table:
// Name: name of the query that will appear in the combo box
// view: name of the supporting couch view that will be used to access the data
// builder: function that returns a builder object. See app/_attachments/charts/chartTotalEvents.js for example
$scope.visualizations=[
	    {name:"By Events - total", view: "grouped_events", builder: getTotalEventsChartBuilder() },
	    {name:"By Search Category", view: "search_by_categories", builder: getTotalEventsChartBuilder() },
	    {name:"My very own query", view: "supporting_custom_view", builder: getMyCustomQueryBuilder() }
	];
```  
* Use the date picker to select a date range for your query  
	* Today
	* Yesterday
	* Last 7 days
	* Last 30 days
	* This Month
	* Last Month
	* Custom range

## A word about CouchApps
CouchApps are web applications which can be served directly from [CouchDB](http://couchdb.apache.org). This gives them the nice property of replicating just like any other data stored in CouchDB. They are also simple to write as they can use the built-in jQuery libraries and plugins that ship with CouchDB.

[More info about CouchApps here.](http://couchapp.org)

## Deploying this app

Assuming you just cloned this app from git, and you have changed into the app directory in your terminal, you want to push it to your CouchDB/Cloudant with the CouchApp command line tool, like this:

    couchapp push . http://name:password@hostname:port/mydatabase

If you don't have a password on your CouchDB/Cloundant (admin party) you can do it like this (but it's a bad, idea, set a password):

    couchapp push . http://hostname:5984/mydatabase

If you get sick of typing the URL, you should setup a `.couchapprc` file in the root of your directory. Remember not to check this into version control as it will have passwords in it.

The `.couchapprc` file should have contents like this:

    {
      "env" : {
        "public" : {
          "db" : "http://name:pass@mycouch.couchone.com/mydatabase"
        },
        "default" : {
          "db" : "http://name:pass@localhost:5984/mydatabase"
        }
      }
    }

Now that you have the `.couchapprc` file set up, you can push your app to the CouchDB as simply as:

    couchapp push

This pushes to the `default` as specified. To push to the `public` you'd run:

    couchapp push public

Of course you can continue to add more deployment targets as you see fit, and give them whatever names you like.
