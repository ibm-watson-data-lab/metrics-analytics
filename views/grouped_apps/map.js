function(doc) {
  if (doc.idsite) {
    emit(doc.idsite, 1);
  }
};