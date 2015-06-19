function(doc) {
  if (doc.type && doc.idsite && doc.date ) {
    emit([doc.idsite, doc.type, doc.date], 1);
  }
};