export function BarChart(){
 const values=[10,18,25,31,40,28,15]; return <div className="barChart" role="img" aria-label="Reservas por día, máximo el viernes">{values.map((v,i)=><div key={i}><span style={{height:`${v*2.1}px`}}><b>{v}</b></span><small>{["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][i]}</small></div>)}</div>
}
export function Donut({value=72,label="Ocupación"}:{value?:number,label?:string}){
 return <div className="donut" role="img" aria-label={`${label}: ${value}%`} style={{"--value":`${value*3.6}deg`} as React.CSSProperties}><div><strong>{value}%</strong><small>{label}</small></div></div>
}
export function PopularBars(){
 const data=[["Latte Signature",120],["Cappuccino",95],["Croissant",82],["Cold Brew Special",68],["Tarta de chocolate",54]]; return <div className="popularBars">{data.map(([n,v])=><div key={n}><span><b>{n}</b><small>{v}</small></span><i><em style={{width:`${Number(v)/1.2}%`}}/></i></div>)}</div>
}
