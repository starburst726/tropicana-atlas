export function formatSnapshotDate(value){
 if(!value||!Number.isFinite(Date.parse(value)))return 'Date unavailable';
 return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(value));
}
export function publicationLabel(value){return value?'Published '+formatSnapshotDate(value):'Website not published · Local preview';}
