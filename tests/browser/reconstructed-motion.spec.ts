import {test,expect} from "@playwright/test";
import {writeFileSync} from "node:fs";

/**
 * Same exact fixed-step 120Hz race, same PlayCanvas camera and real GLB:
 * capture both movement systems. Geometry and race physics must not differ.
 * Screenshots MUST be reviewed before any claim of lifelike ski animation.
 */
test("reconstruction A/B preserves ski contact and changes human articulation",async({page})=>{
  test.setTimeout(210000);
  const result:Record<string,any>={};
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const mode of ["human-v3","rebuild"]){
    await page.goto("/?quality=low&racer=mobile&renderer=webgl2&pose="+mode);
    await expect(page.locator("#loading")).toHaveCount(0,{timeout:75000});
    await page.locator("#play").click();
    await page.evaluate(()=>{
      const api=(window as any).__ski;
      api.start();api.freezeSimulation(true);
      api.step(283,{steer:0,tuck:false,brake:false,jump:false});
      api.step(270,{steer:.85,tuck:true,brake:false,jump:false});
    });
    await page.waitForTimeout(250);
    const data=await page.evaluate(()=>{
      const api=(window as any).__ski;
      return {state:api.getState(),visual:api.getAthletePose()};
    });
    const p=data.visual.competitionPose;
    expect(p).toBeTruthy();
    expect(p.humanMode).toBe(true);
    expect(p.leftAnkleTargetErrorM).toBeLessThan(.015);
    expect(p.rightAnkleTargetErrorM).toBeLessThan(.015);
    expect(p.leftSkiBaseClearanceM).toBeCloseTo(.008,2);
    expect(p.rightSkiBaseClearanceM).toBeCloseTo(.008,2);
    expect(p.leftSkiDirectionErrorDeg).toBeLessThan(.1);
    expect(p.rightSkiDirectionErrorDeg).toBeLessThan(.1);
    expect(p.headWorld[1]-p.pelvisWorld[1]).toBeGreaterThan(.35);
    expect(p.leftHumanHandTargetErrorM).toBeLessThan(.13);
    expect(p.rightHumanHandTargetErrorM).toBeLessThan(.13);
    result[mode]={
      x:data.state.x,z:data.state.z,speed:Math.hypot(data.state.vx,data.state.vz),
      hip:p.pelvisHeightM,bank:p.bodyBankDeg,
      knees:[p.leftKneeFlexionDeg,p.rightKneeFlexionDeg],
      headHeight:p.headWorld[1]-p.pelvisWorld[1],
      ankles:[p.leftAnkleTargetErrorM,p.rightAnkleTargetErrorM],
      hands:[p.leftHumanHandTargetErrorM,p.rightHumanHandTargetErrorM]
    };
    await page.screenshot({path:"test-results/reconstruction-"+mode+"-chase.png"});
    await page.keyboard.press("c");
    await page.waitForTimeout(200);
    await page.screenshot({path:"test-results/reconstruction-"+mode+"-close.png"});
  }
  expect(result.rebuild.x).toBeCloseTo(result["human-v3"].x,3);
  expect(result.rebuild.z).toBeCloseTo(result["human-v3"].z,3);
  expect(result.rebuild.speed).toBeCloseTo(result["human-v3"].speed,3);
  expect(Math.abs(result.rebuild.hip-result["human-v3"].hip)+
    Math.abs(result.rebuild.bank-result["human-v3"].bank)).toBeGreaterThan(.003);
  writeFileSync("test-results/reconstructed-motion-AB.json",
    JSON.stringify(result,null,2));
  console.info("[RECONSTRUCTION_AB]",JSON.stringify(result));
  expect(errors).toEqual([]);
});
