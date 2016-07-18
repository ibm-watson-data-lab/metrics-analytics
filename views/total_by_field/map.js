function(doc) {
  if (doc.idsite && doc.date) {
    var ar = doc.date.split("-");
    if (ar.length == 3) {
      if (doc.uag) {
        emit(["useragent", doc.idsite, Number(ar[0]), Number(ar[1]), Number(ar[2]), doc.uag], null);
      }
      if (doc.search_cat && doc.search_cat.length) {
        for (var i = 0 ; i< doc.search_cat.length; i++) {
          emit(["searchcat", doc.idsite, Number(ar[0]), Number(ar[1]), Number(ar[2]), doc.search_cat[i].value], null);
        }
      }
    }
  }
}