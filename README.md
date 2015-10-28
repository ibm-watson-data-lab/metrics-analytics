# Simple Metrics Analytics

This metrics analytics project is a companion to the [metrics-collector](https://github.com/ibm-cds-labs/metrics-collector) project which is a simple service for capturing user interaction events and storing them in a Cloudant database. Read all about it in [Simple Metrics Tutorial Part 1: Metrics Collection](https://developer.ibm.com/clouddataservices/simple-metrics-tutorial-part-1-metrics-collection/)

Metrics Analytics is the follow-up. This app lets you get actionable insights out of the data you capture. It's a *couchapp* application that provides simple but powerful visualizations. It uses Cloudant’s secondary indexing engine to aggregate JSON (the format of the metrics data). Then pumps that data into [d3](http://d3js.org/) for visualization and analysis. It also uses [angular](https://angularjs.org) and [bootstrap](http://getbootstrap.com/).

![Metrics Analytics Architecture](https://i2.wp.com/developer.ibm.com/clouddataservices/wp-content/uploads/sites/47/2015/07/analytics-arch.png?w=618)

##Play with the app

See it in action. [Visit our demo version](https://examples.cloudant.com/tracker_db/_design/app/index.html). It shows usage reports for our developer.ibm.com/clouddataservices site’s [How Tos page](https://developer.ibm.com/clouddataservices/how-tos/).

##Try the tutorial

This tutorial shows you how to build MapReduce views in Cloudant/CouchDB and wire them to [D3](http://d3js.org) for visualization.

Read all the details and try it yourself:

[Simple Metrics Tutorial Part 2: Visualize with D3 and JSON](https://developer.ibm.com/clouddataservices/simple-metrics-tutorial-part-2-d3-and-json/)


## Deploy this app

Close this app from GitHub and change into the app directory in your terminal. You can push the app to CouchDB/Cloudant with the CouchApp command line tool, like this:

    couchapp push . http://name:password@hostname:port/mydatabase

If you don't have a password on your CouchDB/Cloundant (admin party) you can do it like this (But it's not secure. You should really set a password.):

    couchapp push . http://hostname:5984/mydatabase

If you get sick of typing the URL, you should setup a `.couchapprc` file in the root of your directory. Remember not to check this into version control as it will have passwords in it.

The `.couchapprc` file should have contents like this:

```json
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
```

Now that you have the `.couchapprc` file set up, you can push your app to the CouchDB as simply as:

    couchapp push

This pushes to the `default` as specified. To push to the `public` you'd run:

    couchapp push public

Of course you can continue to add more deployment targets as you see fit, and give them whatever names you like.


##Related links

The Simple Metrics tutorials:

- [Part 1: Metrics Collection](https://developer.ibm.com/clouddataservices/simple-metrics-tutorial-part-1-metrics-collection/)
- [Part 2: Visualize with D3 and JSON](https://developer.ibm.com/clouddataservices/simple-metrics-tutorial-part-2-d3-and-json/) (covers code in this repo)
