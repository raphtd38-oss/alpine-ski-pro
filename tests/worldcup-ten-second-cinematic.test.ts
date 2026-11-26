import {describe,it,expect} from "vitest";
import {Race,SUPER_G_START_FILM_SECONDS} from "../src/game/race";
import type {Course} from "../src/game/types";
import {planStartBroadcast} from "../src/render/worldcup-start-broadcast";
import {staffTVClip} from "../src/render/start-human-actors";

const shortCourse:Course={
  id:"SG",name:"Cortina 2026 SG",subtitle:"Test course",
  length:2105,grade:.3,width:18,gates:[],
};

describe("a genuinely LONG 10-second start, not slowed three-second actors",()=>{
  it("keeps the 120Hz fixed-step race frozen until precisely 10s, then GO",()=>{
    const race=new Race(shortCourse,"SG");
    race.start();
    expect(SUPER_G_START_FILM_SECONDS).toBe(10);
    expect(race.phase).toBe("countdown");
    expect(race.countdown).toBe(10);
    expect(race.startGateOpened).toBe(false);
    for(let tick=0;tick<1199;tick++)
      race.tickCountdown(1/120);
    expect(race.phase).toBe("countdown");
    expect(race.countdown).toBeGreaterThan(0);
    race.tickCountdown(1/120);
    // Guard against floating-point rounding of 1200 times 1/120:
    if(race.phase==="countdown")race.tickCountdown(1e-9);
    expect(race.phase).toBe("racing");
    expect(race.time).toBe(0);
    expect(race.startGateOpened).toBe(false);
    expect(race.startGateImpulseTime).toBeNull();
  });
  it("spends meaningful seconds on five separate shots before the launch",()=>{
    const cuts:[number,string][]=[
      [-9.7,"establishing"],[-8.1,"establishing"],
      [-7.6,"athlete-queue"],[-5.5,"athlete-queue"],
      [-5.0,"coaches"],[-3.1,"coaches"],
      [-2.7,"technical-timing"],[-2.0,"technical-timing"],
      [-1.4,"starter-closeup"],[-.1,"starter-closeup"],
      [.2,"launch"],
    ];
    for(const [t,shot] of cuts)
      expect(planStartBroadcast(t,3)?.name).toBe(shot);
    expect(planStartBroadcast(-11,3)).toBeNull();
    expect(planStartBroadcast(-10.04,3)).toBeNull();
  });
  it("does not use speed-up or a rushed 0.25s cheer clip to fill 10s",()=>{
    expect(staffTVClip("coach",1,-10)).toBe("Idle");
    for(const sec of [-5.1,-4.1,-3.25])
      expect(staffTVClip("coach",1,sec)).toBe("Cheer");
    expect(staffTVClip("coach",1,-.43)).toBe("Wave");
    expect(staffTVClip("coach",1,.8)).toBe("Idle");
  });
});
