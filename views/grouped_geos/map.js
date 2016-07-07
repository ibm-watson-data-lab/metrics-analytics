function(doc) {
  if (doc.geo) {
   emit([doc.geo.long, doc.geo.lat], null) 
  }
}