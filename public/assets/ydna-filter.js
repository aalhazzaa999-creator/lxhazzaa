/* Compatibility API for existing atlas links; topology lives in one shared engine. */
(()=>{'use strict';window.LXYdna={norm:value=>window.LXPhylogenyCore.callState(value,'y')==='reported'?window.LXPhylogenyCore.key(value,'y'):'',resolve:(input,mode='descendants')=>window.LXPhylogeny.resolve(input,mode,'y')};})();
