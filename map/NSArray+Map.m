//
//  NSArray+Map.m
//  map
//
//  Created by bee on 15/06/2017.
//  Copyright © 2017 bee. All rights reserved.
//

#import "NSArray+Map.h"

@implementation NSArray (Map)
-(NSArray *)map:(MapBlock)block{
    NSMutableArray *t = @[].mutableCopy;
    int index = 0;
    for (id obj in self) {
        id result = block(obj,index);
        [t addObject:result];
        index++;
    }
    return t;

}
@end
