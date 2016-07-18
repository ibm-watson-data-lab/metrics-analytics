function(doc) {
  if (doc.idsite && doc.date ) {
    var ar = doc.date.split("-");
    if (ar.length == 3) {
      var value = {};
      if (doc.type) {
        value[doc.type] = 1;
      }
      emit([Number(ar[0]), Number(ar[1]), Number(ar[2])], value);
      emit([doc.idsite, Number(ar[0]), Number(ar[1]), Number(ar[2])], value);
    }
  }
}