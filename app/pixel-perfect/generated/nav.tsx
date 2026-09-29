const imgProfileAvatar = "https://www.figma.com/api/mcp/asset/20743b5a-a0ec-40ce-9332-a95959e93fdb.png";
const imgChevronDown = "https://www.figma.com/api/mcp/asset/caf59b11-0452-405f-8e94-3420b884ccf3.svg";
const imgChevronRight = "https://www.figma.com/api/mcp/asset/acd5d4d4-23e7-4ab5-b063-ded97c010cf2.svg";
const imgUnreadIndicator = "https://www.figma.com/api/mcp/asset/12584008-d015-4142-abab-1c91630e9e28.svg";
const imgBell = "https://www.figma.com/api/mcp/asset/e1d6065c-4a56-40b6-8792-8e0611c2ec8c.svg";
const imgUsers = "https://www.figma.com/api/mcp/asset/eb55656c-3a4d-4c76-85ac-363aa03bccd3.svg";
const imgBarChart3 = "https://www.figma.com/api/mcp/asset/090236b0-8b89-4b00-ad47-30b892e291bf.svg";
const imgTag = "https://www.figma.com/api/mcp/asset/09b8e023-021b-4804-874a-d86eb64f8682.svg";
const imgCompass = "https://www.figma.com/api/mcp/asset/98f17423-9522-49ce-858f-335ea8e42f3d.svg";
const imgDatabase = "https://www.figma.com/api/mcp/asset/f857aca3-f0ad-477b-a1dd-b54ced2785ef.svg";
const imgDumbbell = "https://www.figma.com/api/mcp/asset/6a43720e-caf4-4317-ae62-49a0eb6348ac.svg";
const imgClock3 = "https://www.figma.com/api/mcp/asset/9754eacc-1651-4782-a887-a9a4894508b8.svg";
const imgListChecks = "https://www.figma.com/api/mcp/asset/66db9be3-54a6-45cb-8674-683a2dafc1ec.svg";
const imgCircleX = "https://www.figma.com/api/mcp/asset/0a3c0b03-eb11-4958-b638-06bc718c3998.svg";
const imgRefreshCw = "https://www.figma.com/api/mcp/asset/20db97e9-4c5c-4d67-a759-a827a777a033.svg";
const imgCalendarDays = "https://www.figma.com/api/mcp/asset/08473e24-7a86-4cf1-8b11-8f33ab3def82.svg";
const imgSquareCheck = "https://www.figma.com/api/mcp/asset/5db48e8c-5d82-46a2-b12b-f3ab4bf0ab78.svg";
const imgBranchConnector = "https://www.figma.com/api/mcp/asset/2c44661d-a973-482e-8a84-38b034a7258d.svg";
const imgLifeBranch = "https://www.figma.com/api/mcp/asset/cb1ab29a-e3e6-42f0-adff-6f48e5409584.svg";
const imgHeart = "https://www.figma.com/api/mcp/asset/f472726d-1213-488e-a2bb-7eb44d94573a.svg";
const imgHomeIcon = "https://www.figma.com/api/mcp/asset/e3567eb6-b6ed-405b-9bfa-247d451c9beb.svg";

export default function DesktopCanvasNav() {
  return (
    <div className="bg-black relative size-full" data-node-id="315:1969" data-name="Desktop Canvas / Nav">
      <div className="absolute bg-[var(--background,#050505)] h-[1080px] left-0 overflow-clip shadow-[0px_0px_18px_1px_rgba(17,24,32,0.44)] top-0 w-[333px]" data-node-id="315:1970" data-name="Navigation panel">
        <div className="absolute content-stretch flex gap-[17px] h-[48px] items-center left-[28px] overflow-clip top-[1007px] w-[281px]" data-node-id="315:1971" data-name="Currency row">
          <div className="border-2 border-[var(--border-default,#a3a3a3)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[16777200px] shrink-0 size-[36px]" data-node-id="315:1972" data-name="Currency icon">
            <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[19px] text-[color:var(--text-muted,#a3a3a3)] whitespace-nowrap" data-node-id="315:1973">
              $
            </p>
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[normal] min-w-px not-italic relative text-[16px] text-[color:var(--text-secondary,#d8dbe2)]" data-node-id="315:1974">
            USD
          </p>
          <div className="relative shrink-0 size-[19px]" data-node-id="315:1975" data-name="chevron-down">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronDown} />
          </div>
        </div>
        <div className="absolute content-stretch flex gap-[17px] h-[52px] items-center left-[28px] overflow-clip top-[949px] w-[281px]" data-node-id="315:1977" data-name="Profile row">
          <div className="relative shrink-0 size-[44px]" data-node-id="315:1978" data-name="Profile avatar">
            <img alt="" className="absolute block inset-0 max-w-none size-full" height="44" src={imgProfileAvatar} width="44" />
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[normal] min-w-px not-italic relative text-[16px] text-[color:var(--text-secondary,#d8dbe2)]" data-node-id="315:1979">
            Profile
          </p>
          <div className="relative shrink-0 size-[19px]" data-node-id="315:1980" data-name="chevron-right">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronRight} />
          </div>
        </div>
        <div className="absolute left-[198px] size-[11px] top-[916px]" data-node-id="315:1982" data-name="Unread indicator">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgUnreadIndicator} />
        </div>
        <div className="absolute content-stretch flex gap-[25px] h-[48px] items-center left-[40px] overflow-clip top-[889px] w-[270px]" data-node-id="315:1983" data-name="Primary Navigation Row / 1">
          <div className="relative shrink-0 size-[24px]" data-node-id="I315:1983;311:1458" data-name="bell">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBell} />
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[1.2] min-w-px not-italic relative text-[16px] text-[color:var(--text-secondary,#d8dbe2)]" data-node-id="I315:1983;311:1460">
            Notifications
          </p>
          <div className="relative shrink-0 size-[19px]" data-node-id="I315:1983;311:1461" data-name="chevron-right">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronRight} />
          </div>
        </div>
        <div className="absolute bg-[var(--border-subtle,#171717)] h-px left-[24px] top-[878px] w-[286px]" data-node-id="315:1984" data-name="Divider" />
        <div className="absolute content-stretch flex gap-[25px] h-[48px] items-center left-[40px] overflow-clip top-[821px] w-[270px]" data-node-id="315:1985" data-name="Primary Navigation Row / 2">
          <div className="relative shrink-0 size-[24px]" data-node-id="I315:1985;311:1465" data-name="users">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgUsers} />
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[1.2] min-w-px not-italic relative text-[16px] text-[color:var(--text-secondary,#d8dbe2)]" data-node-id="I315:1985;311:1467">
            Social
          </p>
          <div className="relative shrink-0 size-[19px]" data-node-id="I315:1985;311:1468" data-name="chevron-right">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronRight} />
          </div>
        </div>
        <div className="absolute content-stretch flex gap-[25px] h-[48px] items-center left-[40px] overflow-clip top-[763px] w-[270px]" data-node-id="315:1986" data-name="Primary Navigation Row / 3">
          <div className="relative shrink-0 size-[24px]" data-node-id="I315:1986;311:1472" data-name="bar-chart-3">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBarChart3} />
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[1.2] min-w-px not-italic relative text-[16px] text-[color:var(--text-secondary,#d8dbe2)]" data-node-id="I315:1986;311:1474">
            Financial
          </p>
          <div className="relative shrink-0 size-[19px]" data-node-id="I315:1986;311:1475" data-name="chevron-right">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronRight} />
          </div>
        </div>
        <div className="absolute content-stretch flex gap-[25px] h-[48px] items-center left-[40px] overflow-clip top-[705px] w-[270px]" data-node-id="315:1987" data-name="Primary Navigation Row / 4">
          <div className="relative shrink-0 size-[24px]" data-node-id="I315:1987;311:1479" data-name="tag">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgTag} />
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[1.2] min-w-px not-italic relative text-[16px] text-[color:var(--text-secondary,#d8dbe2)]" data-node-id="I315:1987;311:1481">
            Sell
          </p>
          <div className="relative shrink-0 size-[19px]" data-node-id="I315:1987;311:1482" data-name="chevron-right">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronRight} />
          </div>
        </div>
        <div className="absolute content-stretch flex gap-[25px] h-[48px] items-center left-[40px] overflow-clip top-[647px] w-[270px]" data-node-id="315:1988" data-name="Primary Navigation Row / 5">
          <div className="relative shrink-0 size-[24px]" data-node-id="I315:1988;311:1486" data-name="compass">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCompass} />
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[1.2] min-w-px not-italic relative text-[16px] text-[color:var(--text-secondary,#d8dbe2)]" data-node-id="I315:1988;311:1488">
            Discover
          </p>
          <div className="relative shrink-0 size-[19px]" data-node-id="I315:1988;311:1489" data-name="chevron-right">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronRight} />
          </div>
        </div>
        <div className="absolute content-stretch flex gap-[25px] h-[48px] items-center left-[40px] overflow-clip top-[589px] w-[270px]" data-node-id="315:1989" data-name="Primary Navigation Row / 6">
          <div className="relative shrink-0 size-[24px]" data-node-id="I315:1989;311:1493" data-name="database">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgDatabase} />
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[1.2] min-w-px not-italic relative text-[16px] text-[color:var(--text-secondary,#d8dbe2)]" data-node-id="I315:1989;311:1495">
            Collect
          </p>
          <div className="relative shrink-0 size-[19px]" data-node-id="I315:1989;311:1496" data-name="chevron-right">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronRight} />
          </div>
        </div>
        <div className="absolute bg-[rgba(0,0,0,0)] h-[43px] left-[56px] overflow-clip top-[521px] w-[253px]" data-node-id="315:1990" data-name="Life Navigation Row / 1">
          <div className="absolute content-stretch flex gap-[20px] h-[43px] items-center left-[20px] overflow-clip top-0 w-[210px]" data-node-id="I315:1990;311:1537" data-name="Item content">
            <div className="relative shrink-0 size-[22px]" data-node-id="I315:1990;311:1538" data-name="dumbbell">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgDumbbell} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[1.2] not-italic relative shrink-0 text-[15px] text-[color:var(--text-muted,#a3a3a3)] whitespace-nowrap" data-node-id="I315:1990;311:1540">
              Fitness
            </p>
          </div>
        </div>
        <div className="absolute bg-[rgba(0,0,0,0)] h-[43px] left-[56px] overflow-clip top-[477px] w-[253px]" data-node-id="315:1991" data-name="Life Navigation Row / 2">
          <div className="absolute content-stretch flex gap-[20px] h-[43px] items-center left-[20px] overflow-clip top-0 w-[210px]" data-node-id="I315:1991;311:1543" data-name="Item content">
            <div className="relative shrink-0 size-[22px]" data-node-id="I315:1991;311:1544" data-name="clock-3">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgClock3} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[1.2] not-italic relative shrink-0 text-[15px] text-[color:var(--text-muted,#a3a3a3)] whitespace-nowrap" data-node-id="I315:1991;311:1546">
              Schedule
            </p>
          </div>
        </div>
        <div className="absolute bg-[rgba(0,0,0,0)] h-[43px] left-[56px] overflow-clip top-[433px] w-[253px]" data-node-id="315:1992" data-name="Life Navigation Row / 3">
          <div className="absolute content-stretch flex gap-[20px] h-[43px] items-center left-[20px] overflow-clip top-0 w-[210px]" data-node-id="I315:1992;311:1549" data-name="Item content">
            <div className="relative shrink-0 size-[22px]" data-node-id="I315:1992;311:1550" data-name="list-checks">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgListChecks} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[1.2] not-italic relative shrink-0 text-[15px] text-[color:var(--text-muted,#a3a3a3)] whitespace-nowrap" data-node-id="I315:1992;311:1552">
              Checklists
            </p>
          </div>
        </div>
        <div className="absolute bg-[rgba(0,0,0,0)] h-[43px] left-[56px] overflow-clip top-[389px] w-[253px]" data-node-id="315:1993" data-name="Life Navigation Row / 4">
          <div className="absolute content-stretch flex gap-[20px] h-[43px] items-center left-[20px] overflow-clip top-0 w-[210px]" data-node-id="I315:1993;311:1555" data-name="Item content">
            <div className="relative shrink-0 size-[22px]" data-node-id="I315:1993;311:1556" data-name="circle-x">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCircleX} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[1.2] not-italic relative shrink-0 text-[15px] text-[color:var(--text-muted,#a3a3a3)] whitespace-nowrap" data-node-id="I315:1993;311:1558">
              Goals
            </p>
          </div>
        </div>
        <div className="absolute bg-[rgba(0,0,0,0)] h-[43px] left-[56px] overflow-clip top-[345px] w-[253px]" data-node-id="315:1994" data-name="Life Navigation Row / 5">
          <div className="absolute content-stretch flex gap-[20px] h-[43px] items-center left-[20px] overflow-clip top-0 w-[210px]" data-node-id="I315:1994;311:1561" data-name="Item content">
            <div className="relative shrink-0 size-[22px]" data-node-id="I315:1994;311:1562" data-name="refresh-cw">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgRefreshCw} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[1.2] not-italic relative shrink-0 text-[15px] text-[color:var(--text-muted,#a3a3a3)] whitespace-nowrap" data-node-id="I315:1994;311:1564">
              Routines
            </p>
          </div>
        </div>
        <div className="absolute bg-[rgba(0,0,0,0)] h-[43px] left-[56px] overflow-clip top-[301px] w-[253px]" data-node-id="315:1995" data-name="Life Navigation Row / 6">
          <div className="absolute content-stretch flex gap-[20px] h-[43px] items-center left-[20px] overflow-clip top-0 w-[210px]" data-node-id="I315:1995;311:1567" data-name="Item content">
            <div className="relative shrink-0 size-[22px]" data-node-id="I315:1995;311:1568" data-name="calendar-days">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCalendarDays} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[1.2] not-italic relative shrink-0 text-[15px] text-[color:var(--text-muted,#a3a3a3)] whitespace-nowrap" data-node-id="I315:1995;311:1570">
              Calendar
            </p>
          </div>
        </div>
        <div className="absolute bg-gradient-to-r from-[#1e080b] h-[43px] left-[56px] overflow-clip rounded-[10px] to-[#260b0e] top-[257px] w-[253px]" data-node-id="315:1996" data-name="Life Navigation Row / 7">
          <div className="absolute content-stretch flex gap-[20px] h-[43px] items-center left-[20px] overflow-clip top-0 w-[210px]" data-node-id="I315:1996;311:1573" data-name="Item content">
            <div className="relative shrink-0 size-[22px]" data-node-id="I315:1996;311:1574" data-name="square-check">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSquareCheck} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[1.2] not-italic relative shrink-0 text-[15px] text-[color:var(--text-secondary,#d8dbe2)] whitespace-nowrap" data-node-id="I315:1996;311:1576">
              Tasks
            </p>
          </div>
          <div className="absolute bg-[var(--accent-brand,#ff1128)] h-[37px] left-0 rounded-[16777200px] top-[3px] w-[4px]" data-node-id="I315:1996;311:1577" data-name="Active edge" />
        </div>
        <div className="absolute h-0 left-[42px] top-[542px] w-[15px]" data-node-id="315:1997" data-name="Branch connector">
          <div className="absolute inset-[-1.3px_0_0_0]">
            <img alt="" className="block max-w-none size-full" src={imgBranchConnector} />
          </div>
        </div>
        <div className="absolute h-0 left-[42px] top-[498px] w-[15px]" data-node-id="315:1998" data-name="Branch connector">
          <div className="absolute inset-[-1.3px_0_0_0]">
            <img alt="" className="block max-w-none size-full" src={imgBranchConnector} />
          </div>
        </div>
        <div className="absolute h-0 left-[42px] top-[454px] w-[15px]" data-node-id="315:1999" data-name="Branch connector">
          <div className="absolute inset-[-1.3px_0_0_0]">
            <img alt="" className="block max-w-none size-full" src={imgBranchConnector} />
          </div>
        </div>
        <div className="absolute h-0 left-[42px] top-[410px] w-[15px]" data-node-id="315:2000" data-name="Branch connector">
          <div className="absolute inset-[-1.3px_0_0_0]">
            <img alt="" className="block max-w-none size-full" src={imgBranchConnector} />
          </div>
        </div>
        <div className="absolute h-0 left-[42px] top-[366px] w-[15px]" data-node-id="315:2001" data-name="Branch connector">
          <div className="absolute inset-[-1.3px_0_0_0]">
            <img alt="" className="block max-w-none size-full" src={imgBranchConnector} />
          </div>
        </div>
        <div className="absolute h-0 left-[42px] top-[322px] w-[15px]" data-node-id="315:2002" data-name="Branch connector">
          <div className="absolute inset-[-1.3px_0_0_0]">
            <img alt="" className="block max-w-none size-full" src={imgBranchConnector} />
          </div>
        </div>
        <div className="absolute h-0 left-[42px] top-[278px] w-[15px]" data-node-id="315:2003" data-name="Branch connector">
          <div className="absolute inset-[-1.3px_0_0_0]">
            <img alt="" className="block max-w-none size-full" src={imgBranchConnector} />
          </div>
        </div>
        <div className="absolute flex h-[294px] items-center justify-center left-[42px] top-[251px] w-0" data-node-id="315:2004">
          <div className="flex-none rotate-90">
            <div className="h-0 relative w-[294px]" data-name="Life branch">
              <div className="absolute inset-[-1.3px_0_0_0]">
                <img alt="" className="block max-w-none size-full" src={imgLifeBranch} />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute content-stretch flex gap-[25px] h-[48px] items-center left-[40px] overflow-clip top-[204px] w-[269px]" data-node-id="315:2005" data-name="Life row">
          <div className="relative shrink-0 size-[24px]" data-node-id="315:2006" data-name="heart">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHeart} />
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[normal] min-w-px not-italic relative text-[16px] text-[color:var(--text-secondary,#d8dbe2)]" data-node-id="315:2008">
            Life
          </p>
          <div className="relative shrink-0 size-[19px]" data-node-id="315:2009" data-name="chevron-down">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronDown} />
          </div>
        </div>
        <div className="absolute bg-gradient-to-r content-stretch flex from-[#23090c] gap-[25px] h-[50px] items-center left-[14px] overflow-clip pl-[26px] pr-[12px] rounded-[10px] to-[#240a0d] top-[147px] w-[305px]" data-node-id="315:2011" data-name="Home row">
          <div className="relative shrink-0 size-[24px]" data-node-id="315:2012" data-name="Home icon">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHomeIcon} />
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[16px] text-[color:var(--text-secondary,#d8dbe2)]" data-node-id="315:2013">
            Home
          </p>
        </div>
        <div className="absolute bg-[var(--accent-brand,#ff1128)] h-[46px] left-[14px] rounded-[16777200px] shadow-[0px_0px_15px_0px_rgba(255,17,40,0.17)] top-[149px] w-[4px]" data-node-id="315:2014" data-name="Home active edge" />
        <div className="absolute bg-[#d9d9d9] h-[120px] left-[14px] rounded-[8px] top-[13px] w-[295px]" data-node-id="333:1869" />
      </div>
      <div className="absolute bg-black h-[1080px] left-[333px] top-0 w-[1587px]" data-node-id="315:2079" data-name="Content region" />
    </div>
  );
}
